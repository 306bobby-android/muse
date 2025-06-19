import {injectable} from 'inversify';
import {Innertube} from 'youtubei.js';
import {SongMetadata} from './player.js';
import YoutubeAPI from './youtube-api.js';

@injectable()
export default class RadioService {
  private innertube?: Innertube;

  constructor(private readonly youtubeAPI: YoutubeAPI) {}

  private async initialize() {
    if (this.innertube) return;
    this.innertube = await Innertube.create();
  }

  public async getRadioSongs(
    videoId: string,
    limit: number,
  ): Promise<SongMetadata[]> {
    await this.initialize();

    try {
      if (!this.innertube) {
        throw new Error('Innertube not initialized');
      }

      const upNextPanel = await this.innertube.music.getUpNext(videoId, true);

      let allItems: any[] = [];
      if (upNextPanel.contents) {
        allItems.push(...upNextPanel.contents);
      }

      // If the initial response has a continuation token, fetch the next batch of songs.
      if (upNextPanel.continuation) {
        const continuationResponse = await this.innertube.actions.execute('/next', { continuation: upNextPanel.continuation });

        // The InnerTube API often returns continuation items in this structure.
        const continuationItems = continuationResponse.data.onResponseReceivedActions?.[0].appendContinuationItemsAction?.continuationItems;

        if (continuationItems) {
            allItems.push(...continuationItems);
        }
      }

      if (allItems.length === 0) {
        return [];
      }

      // Extract video IDs, checking for different possible item structures.
      const videoIds = allItems
        .map((item: any) => item.playlistPanelVideoRenderer?.videoId || item.videoId)
        .filter((id?: string): id is string => !!id);

      if (videoIds.length === 0) {
        return [];
      }

      const songs: SongMetadata[] = [];

      // Fetch details for all songs concurrently for better performance.
      const songPromises = videoIds.slice(0, limit).map(id => this.youtubeAPI.getVideo(id, false));
      const songResults = await Promise.all(songPromises);

      for (const videoDetails of songResults) {
        if (videoDetails.length > 0) {
          songs.push(videoDetails[0]);
        }
      }

      return songs;

    } catch (error) {
      console.error('Error getting radio songs:', error);
      return [];
    }
  }
}
