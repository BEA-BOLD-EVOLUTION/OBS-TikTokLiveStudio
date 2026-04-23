import OBSWebSocket from 'obs-websocket-js';

/**
 * Media action types for OBS media sources
 */
export type MediaAction =
  | 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE'
  | 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY'
  | 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE'
  | 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP'
  | 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART'
  | 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NEXT'
  | 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PREVIOUS';

/**
 * Media playback event callback
 */
export interface MediaPlaybackEndedEvent {
  inputName: string;
  inputUuid: string;
}

/**
 * Controller for OBS media sources (video playback)
 */
export class MediaSourceController {
  private obs: OBSWebSocket;
  private playbackEndedListeners: Map<string, Set<() => void>> = new Map();

  constructor(obs: OBSWebSocket) {
    this.obs = obs;
    this.setupEventHandlers();
  }

  /**
   * Play a media source by name
   */
  async play(sourceName: string): Promise<void> {
    try {
      await this.obs.call('TriggerMediaInputAction', {
        inputName: sourceName,
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY',
      });
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to play media source "${sourceName}": ${err.message}`);
    }
  }

  /**
   * Pause a media source by name
   */
  async pause(sourceName: string): Promise<void> {
    try {
      await this.obs.call('TriggerMediaInputAction', {
        inputName: sourceName,
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE',
      });
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to pause media source "${sourceName}": ${err.message}`);
    }
  }

  /**
   * Stop a media source by name
   */
  async stop(sourceName: string): Promise<void> {
    try {
      await this.obs.call('TriggerMediaInputAction', {
        inputName: sourceName,
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP',
      });
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to stop media source "${sourceName}": ${err.message}`);
    }
  }

  /**
   * Restart a media source from the beginning
   */
  async restart(sourceName: string): Promise<void> {
    try {
      await this.obs.call('TriggerMediaInputAction', {
        inputName: sourceName,
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART',
      });
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to restart media source "${sourceName}": ${err.message}`);
    }
  }

  /**
   * Subscribe to playback ended event for a specific media source
   * Returns unsubscribe function
   */
  onPlaybackEnded(sourceName: string, callback: () => void): () => void {
    if (!this.playbackEndedListeners.has(sourceName)) {
      this.playbackEndedListeners.set(sourceName, new Set());
    }

    const listeners = this.playbackEndedListeners.get(sourceName)!;
    listeners.add(callback);

    // Return unsubscribe function
    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.playbackEndedListeners.delete(sourceName);
      }
    };
  }

  /**
   * Set up event handlers for media playback events
   */
  private setupEventHandlers(): void {
    this.obs.on('MediaInputPlaybackEnded', (event: MediaPlaybackEndedEvent) => {
      const listeners = this.playbackEndedListeners.get(event.inputName);
      if (listeners) {
        listeners.forEach((callback) => callback());
      }
    });
  }

  /**
   * Get media source settings (including file path)
   */
  async getSettings(sourceName: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.obs.call('GetInputSettings', {
        inputName: sourceName,
      });
      return response.inputSettings;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to get settings for media source "${sourceName}": ${err.message}`);
    }
  }

  /**
   * Set media source file path
   */
  async setFilePath(sourceName: string, filePath: string): Promise<void> {
    try {
      await this.obs.call('SetInputSettings', {
        inputName: sourceName,
        inputSettings: {
          local_file: filePath,
        },
      });
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to set file path for media source "${sourceName}": ${err.message}`);
    }
  }

  /**
   * Create or ensure a media source exists in a scene
   * Returns the scene item ID
   */
  async ensureMediaSource(
    sceneName: string,
    sourceName: string,
    filePath: string,
  ): Promise<number> {
    try {
      // Try to get existing source
      const sceneItems = await this.obs.call('GetSceneItemList', {
        sceneName: sceneName,
      });

      const existingItem = (sceneItems.sceneItems as any[]).find(
        (item: any) => item.sourceName === sourceName,
      );

      if (existingItem) {
        // Update file path if source exists
        await this.setFilePath(sourceName, filePath);
        return existingItem.sceneItemId as number;
      }

      // Create new media source
      await this.obs.call('CreateInput', {
        sceneName: sceneName,
        inputName: sourceName,
        inputKind: 'ffmpeg_source',
        inputSettings: {
          local_file: filePath,
          is_local_file: true,
          restart_on_activate: true,
          close_when_inactive: true,
        },
      });

      // Get the newly created scene item ID
      const updatedSceneItems = await this.obs.call('GetSceneItemList', {
        sceneName: sceneName,
      });

      const newItem = (updatedSceneItems.sceneItems as any[]).find(
        (item: any) => item.sourceName === sourceName,
      );

      if (!newItem) {
        throw new Error('Failed to create media source');
      }

      return newItem.sceneItemId as number;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to ensure media source "${sourceName}": ${err.message}`);
    }
  }
}
