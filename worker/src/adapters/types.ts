import type { BoxScore, Game, Player, PlayerProfile, Standing, TeamExtras } from '../../../shared/types';
import type { Ctx } from '../context';

export interface Adapter {
  schedule(ctx: Ctx): Promise<Game[]>;
  standing(ctx: Ctx): Promise<Standing | null>;
  roster(ctx: Ctx): Promise<Player[]>;
  boxScore(ctx: Ctx, game: Game): Promise<BoxScore>;
  extras(ctx: Ctx, deps: { schedule: Game[] | null; roster: Player[] | null }): Promise<TeamExtras>;
  player(ctx: Ctx, id: string): Promise<PlayerProfile>;
}
