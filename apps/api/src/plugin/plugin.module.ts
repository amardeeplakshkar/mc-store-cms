import { Module } from '@nestjs/common';
import { PluginController } from './plugin.controller';
import { PluginGuard } from './plugin.guard';

@Module({ controllers: [PluginController], providers: [PluginGuard] })
export class PluginModule {}
