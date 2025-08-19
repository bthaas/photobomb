import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SyncService } from './sync.service';
import { User } from '../entities/user.entity';

@Resolver()
export class SyncResolver {
  constructor(private syncService: SyncService) {}

  @Query(() => String)
  @UseGuards(JwtAuthGuard)
  async syncStatus(@CurrentUser() user: User): Promise<string> {
    const status = await this.syncService.getSyncStatus(user.id);
    return JSON.stringify(status);
  }

  @Mutation(() => String)
  @UseGuards(JwtAuthGuard)
  async syncData(
    @CurrentUser() user: User,
    @Args('data') data: string,
  ): Promise<string> {
    const result = await this.syncService.syncUserData(user.id, JSON.parse(data));
    return JSON.stringify(result);
  }
}