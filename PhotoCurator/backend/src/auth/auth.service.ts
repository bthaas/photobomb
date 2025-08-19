import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { User } from '../entities/user.entity';
import { RegisterInput } from './dto/register.input';
import { LoginInput } from './dto/login.input';
import { AuthResponse } from './dto/auth.response';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerInput: RegisterInput): Promise<AuthResponse> {
    const { email, password, firstName, lastName } = registerInput;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new UnauthorizedException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      preferences: {
        defaultCurationGoal: 'best_shots',
        autoAnalyze: true,
        backgroundProcessing: true,
        hapticFeedback: true,
        cloudSync: false,
        privacyMode: false,
      },
    });

    const savedUser = await this.userRepository.save(user);

    // Generate JWT
    const token = this.jwtService.sign({ userId: savedUser.id });

    return {
      user: savedUser,
      token,
    };
  }

  async login(loginInput: LoginInput): Promise<AuthResponse> {
    const { email, password } = loginInput;

    // Find user
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT
    const token = this.jwtService.sign({ userId: user.id });

    return {
      user,
      token,
    };
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}