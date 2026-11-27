package com.business.storedelivery;

import com.google.gson.*;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

public final class StoreDeliveryPlugin extends JavaPlugin {
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final Gson gson = new Gson();
    private final AtomicBoolean polling = new AtomicBoolean(false);
    private BukkitTask task;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        schedule();
    }

    @Override
    public void onDisable() {
        if (task != null) task.cancel();
    }

    private void schedule() {
        if (task != null) task.cancel();
        long ticks = Math.max(10, getConfig().getLong("poll-interval-seconds", 30)) * 20L;
        if (getConfig().getString("plugin-key", "").isBlank()) {
            getLogger().warning("plugin-key is not set in config.yml; deliveries are disabled.");
            return;
        }
        task = Bukkit.getScheduler().runTaskTimer(this, this::poll, 100L, ticks);
    }

    private HttpRequest.Builder req(String path) {
        return HttpRequest.newBuilder(URI.create(getConfig().getString("api-url") + path))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json")
                .header("X-Plugin-Key", getConfig().getString("plugin-key", ""));
    }

    private CompletableFuture<JsonObject> post(String path, JsonObject body) {
        return http.sendAsync(req(path).POST(HttpRequest.BodyPublishers.ofString(gson.toJson(body))).build(), HttpResponse.BodyHandlers.ofString())
                .thenApply(r -> {
                    if (r.statusCode() >= 300) throw new RuntimeException("HTTP " + r.statusCode() + ": " + r.body());
                    return JsonParser.parseString(r.body()).getAsJsonObject();
                });
    }

    /** Runs on the main thread: snapshot online players, fetch queue async, execute on main thread, ack async. */
    private void poll() {
        if (!polling.compareAndSet(false, true)) return;
        JsonArray online = new JsonArray();
        for (Player p : Bukkit.getOnlinePlayers()) {
            JsonObject o = new JsonObject();
            o.addProperty("uuid", p.getUniqueId().toString());
            o.addProperty("name", p.getName());
            online.add(o);
        }
        JsonObject body = new JsonObject();
        body.add("online", online);
        post("/plugin/queue", body).whenComplete((res, err) -> {
            if (err != null) {
                getLogger().warning("Queue fetch failed: " + err.getMessage());
                polling.set(false);
                return;
            }
            JsonArray deliveries = res.getAsJsonArray("deliveries");
            if (deliveries == null || deliveries.isEmpty()) {
                polling.set(false);
                return;
            }
            Bukkit.getScheduler().runTask(this, () -> execute(deliveries));
        });
    }

    private void execute(JsonArray deliveries) {
        JsonArray results = new JsonArray();
        for (JsonElement el : deliveries) {
            JsonObject d = el.getAsJsonObject();
            String id = d.get("id").getAsString();
            String cmd = d.get("command").getAsString();
            JsonObject r = new JsonObject();
            r.addProperty("id", id);
            try {
                boolean ok = Bukkit.dispatchCommand(Bukkit.getConsoleSender(), cmd);
                r.addProperty("success", ok);
                if (!ok) r.addProperty("error", "Command returned false (unknown command?)");
                getLogger().info((ok ? "Delivered: " : "Failed: ") + cmd);
            } catch (Exception e) {
                r.addProperty("success", false);
                r.addProperty("error", String.valueOf(e.getMessage()));
            }
            results.add(r);
        }
        JsonObject body = new JsonObject();
        body.add("results", results);
        post("/plugin/ack", body).whenComplete((res, err) -> {
            if (err != null) getLogger().warning("Ack failed: " + err.getMessage());
            polling.set(false);
        });
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (command.getName().equalsIgnoreCase("storedelivery")) {
            if (args.length > 0 && args[0].equalsIgnoreCase("reload")) {
                reloadConfig();
                schedule();
                sender.sendMessage(ChatColor.GREEN + "StoreDelivery reloaded.");
            } else {
                poll();
                sender.sendMessage(ChatColor.GREEN + "Checking for purchases...");
            }
            return true;
        }
        if (command.getName().equalsIgnoreCase("link")) {
            if (!(sender instanceof Player player)) {
                sender.sendMessage("Only players can link accounts.");
                return true;
            }
            if (args.length != 1) {
                player.sendMessage(ChatColor.YELLOW + "Usage: /link <code from the webstore Account page>");
                return true;
            }
            JsonObject body = new JsonObject();
            body.addProperty("code", args[0]);
            body.addProperty("uuid", player.getUniqueId().toString());
            body.addProperty("username", player.getName());
            post("/plugin/link", body).whenComplete((res, err) -> Bukkit.getScheduler().runTask(this, () -> {
                if (err != null) player.sendMessage(ChatColor.RED + "Could not reach the store. Try again later.");
                else player.sendMessage((res.get("ok").getAsBoolean() ? ChatColor.GREEN : ChatColor.RED) + res.get("message").getAsString());
            }));
            return true;
        }
        return false;
    }
}
