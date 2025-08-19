import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { UpdateUserInput } from './dto/update-user.input';
export declare class UsersResolver {
    private usersService;
    constructor(usersService: UsersService);
    me(context: any): Promise<User>;
    updateProfile(updateUserInput: UpdateUserInput, context: any): Promise<User>;
}
