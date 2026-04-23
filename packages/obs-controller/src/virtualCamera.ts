import type OBSWebSocket from 'obs-websocket-js';

/**
 * Manages OBS virtual camera
 */
export class VirtualCameraController {
  constructor(private obs: OBSWebSocket) {}

  /**
   * Start virtual camera
   */
  async start(): Promise<void> {
    await this.obs.call('StartVirtualCam');
  }

  /**
   * Stop virtual camera
   */
  async stop(): Promise<void> {
    await this.obs.call('StopVirtualCam');
  }

  /**
   * Toggle virtual camera on/off
   */
  async toggle(): Promise<boolean> {
    const status = await this.getStatus();
    if (status.active) {
      await this.stop();
      return false;
    } else {
      await this.start();
      return true;
    }
  }

  /**
   * Get virtual camera status
   */
  async getStatus(): Promise<{ active: boolean }> {
    const status = await this.obs.call('GetVirtualCamStatus');
    return { active: status.outputActive };
  }
}
