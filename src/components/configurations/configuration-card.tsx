'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Configuration } from '@/types/configuration';
import { Pencil, Trash2, Loader2, Monitor, Globe, Smartphone, Settings } from 'lucide-react';

interface ConfigurationCardProps {
  configuration: Configuration;
  onEdit: (configuration: Configuration) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function ConfigurationCard({
  configuration,
  onEdit,
  onDelete,
  isDeleting = false,
}: ConfigurationCardProps) {
  const { configParams } = configuration;
  const hasEnvInfo =
    configParams.os ||
    configParams.browser ||
    configParams.device ||
    configParams.resolution ||
    configParams.locale;

  return (
    <Card className={!configuration.isActive ? 'opacity-60' : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">
            <div className="flex items-center gap-2">
              <Settings className="size-4 text-muted-foreground" />
              <span>{configuration.name}</span>
            </div>
          </CardTitle>
          <Badge variant={configuration.isActive ? 'default' : 'secondary'}>
            {configuration.isActive ? '有効' : '無効'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {configuration.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{configuration.description}</p>
        )}

        {/* Environment Info */}
        {hasEnvInfo && (
          <div className="space-y-2 text-sm">
            {/* OS Info */}
            {(configParams.os || configParams.osVersion) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Monitor className="size-4" />
                <span>
                  {configParams.os}
                  {configParams.osVersion && ` ${configParams.osVersion}`}
                </span>
              </div>
            )}

            {/* Browser Info */}
            {(configParams.browser || configParams.browserVersion) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="size-4" />
                <span>
                  {configParams.browser}
                  {configParams.browserVersion && ` ${configParams.browserVersion}`}
                </span>
              </div>
            )}

            {/* Device Info */}
            {configParams.device && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Smartphone className="size-4" />
                <span>
                  {configParams.device}
                  {configParams.deviceType && ` (${configParams.deviceType})`}
                </span>
              </div>
            )}

            {/* Additional Info */}
            <div className="flex flex-wrap gap-1">
              {configParams.resolution && (
                <Badge variant="outline" className="text-xs">
                  {configParams.resolution}
                </Badge>
              )}
              {configParams.locale && (
                <Badge variant="outline" className="text-xs">
                  {configParams.locale}
                </Badge>
              )}
              {configParams.timezone && (
                <Badge variant="outline" className="text-xs">
                  {configParams.timezone}
                </Badge>
              )}
            </div>
          </div>
        )}

        {!hasEnvInfo && !configuration.description && (
          <p className="text-sm text-muted-foreground">環境情報が設定されていません</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(configuration)}
          >
            <Pencil className="mr-1 size-3" />
            編集
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-destructive hover:text-destructive"
            onClick={() => onDelete(configuration.id)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="mr-1 size-3 animate-spin" />
            ) : (
              <Trash2 className="mr-1 size-3" />
            )}
            削除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
