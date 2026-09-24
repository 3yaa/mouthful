export type CastMember = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
};

export type ActorWork = {
  id: number;
  title: string;
  poster_path: string | null;
  media_type: string;
  popularity: number;
  date: string;
};

import type { AuthFetch } from "@/app/auth/hooks/useAuthFetch";

// creators rides like directors from movie does
export async function fetchShowCast(
  tmdbId: number,
  authFetch: AuthFetch,
): Promise<{ cast: CastMember[]; creators: CastMember[] }> {
  const res = await authFetch(`/api/show-cast?tmdbId=${tmdbId}`);
  const data = await res.json();
  return { cast: data.cast ?? [], creators: data.creators ?? [] };
}

// get both actor and director
export async function fetchMovieCredits(
  tmdbId: string,
  imdbId: string,
  movieId: number,
  authFetch: AuthFetch,
): Promise<{ cast: CastMember[]; directors: CastMember[] }> {
  const res = await authFetch(
    `/api/movie-cast?tmdbId=${tmdbId}&imdbId=${imdbId}&movieId=${movieId}`,
  );
  const data = await res.json();
  return { cast: data.cast ?? [], directors: data.directors ?? [] };
}

export async function fetchActorWorks(
  actorId: number,
  authFetch: AuthFetch,
  role?: "director" | "creator",
): Promise<ActorWork[]> {
  const res = await authFetch(
    `/api/actor-works?actorId=${actorId}${role ? `&role=${role}` : ""}`,
  );
  const data = await res.json();
  return data.works;
}
