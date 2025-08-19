import { Photo } from './photo.entity';
export declare class User {
    id: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    photos: Photo[];
}
