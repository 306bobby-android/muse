import { injectable } from 'inversify';
import YTMusic, { Innertube, YTNodes }  from 'youtubei.js';
import { SongMetadata } from './player.js';
import YoutubeAPI from './youtube-api.js';

@injectable()
export default class RadioService {
  private innertube: Innertube | undefined;

  constructor(private readonly youtubeAPI: YoutubeAPI) {
    this.initialize();
  }

  private async initialize() {
    this.innertube = await Innertube.create();
  }

  public async getRadioSongs(
    videoId: string,
    limit: number,
  ): Promise<SongMetadata[]> {
    if (!this.innertube) {
      await this.initialize();
    }

    try {
      // First, get the track info for the initial video
      const trackInfo = await this.innertube!.music.getInfo(videoId);

      // Now, get the "Up Next" playlist for that track
      const upNext = await trackInfo.getUpNext();

      if (!upNext.contents) {
        return [];
      }

      // Extract the video IDs from the "Up Next" playlist
      const videoIds = upNext.contents
        .slice(0, limit)
        .map(item => (item as any).id)
        .filter((id?: string): id is string => !!id);

      // Get the full metadata for each video
      const songs: SongMetadata[] = [];
      for (const id of videoIds) {
        const videoDetails = await this.youtubeAPI.getVideo(id, false);
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
