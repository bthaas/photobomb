"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const jwt_1 = require("@nestjs/jwt");
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
const auth_service_1 = require("./auth.service");
const users_service_1 = require("../users/users.service");
describe('AuthService', () => {
    let service;
    let usersService;
    let jwtService;
    const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedPassword',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        photos: [],
    };
    const mockUsersService = {
        findByEmail: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
    };
    const mockJwtService = {
        sign: jest.fn(),
        verify: jest.fn(),
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                auth_service_1.AuthService,
                {
                    provide: users_service_1.UsersService,
                    useValue: mockUsersService,
                },
                {
                    provide: jwt_1.JwtService,
                    useValue: mockJwtService,
                },
            ],
        }).compile();
        service = module.get(auth_service_1.AuthService);
        usersService = module.get(users_service_1.UsersService);
        jwtService = module.get(jwt_1.JwtService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    describe('validateUser', () => {
        it('should return user if credentials are valid', async () => {
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            const result = await service.validateUser('test@example.com', 'password');
            expect(result).toEqual(mockUser);
            expect(mockUsersService.findByEmail).toHaveBeenCalledWith('test@example.com');
        });
        it('should return null if credentials are invalid', async () => {
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            const result = await service.validateUser('test@example.com', 'wrongpassword');
            expect(result).toBeNull();
        });
        it('should return null if user does not exist', async () => {
            mockUsersService.findByEmail.mockResolvedValue(null);
            const result = await service.validateUser('nonexistent@example.com', 'password');
            expect(result).toBeNull();
        });
    });
    describe('login', () => {
        it('should return access token and user on successful login', async () => {
            const loginInput = { email: 'test@example.com', password: 'password' };
            const accessToken = 'jwt-token';
            jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser);
            mockJwtService.sign.mockReturnValue(accessToken);
            const result = await service.login(loginInput);
            expect(result).toEqual({
                accessToken,
                user: mockUser,
            });
        });
        it('should throw UnauthorizedException on invalid credentials', async () => {
            const loginInput = { email: 'test@example.com', password: 'wrongpassword' };
            jest.spyOn(service, 'validateUser').mockResolvedValue(null);
            await expect(service.login(loginInput)).rejects.toThrow(common_1.UnauthorizedException);
        });
    });
    describe('register', () => {
        it('should create user and return access token', async () => {
            const registerInput = {
                email: 'new@example.com',
                password: 'password',
                firstName: 'New',
                lastName: 'User',
            };
            const hashedPassword = 'hashedPassword';
            const accessToken = 'jwt-token';
            mockUsersService.findByEmail.mockResolvedValue(null);
            jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword);
            mockUsersService.create.mockResolvedValue(mockUser);
            mockJwtService.sign.mockReturnValue(accessToken);
            const result = await service.register(registerInput);
            expect(result).toEqual({
                accessToken,
                user: mockUser,
            });
            expect(mockUsersService.create).toHaveBeenCalledWith({
                ...registerInput,
                password: hashedPassword,
            });
        });
        it('should throw UnauthorizedException if user already exists', async () => {
            const registerInput = {
                email: 'existing@example.com',
                password: 'password',
            };
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            await expect(service.register(registerInput)).rejects.toThrow(common_1.UnauthorizedException);
        });
    });
});
//# sourceMappingURL=auth.service.spec.js.map