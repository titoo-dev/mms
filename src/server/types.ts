export type LoadedTracks = { current: number; total: number; done: boolean };
export type Lyrics = {
  text: string;
  isSync: boolean;
};

export enum StateKey {
  DirectoryHash = "MUSIC_DIRECTORY_HASH",
}
