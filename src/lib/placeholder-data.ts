
import type { User, Subscription } from './types';
import type { AdminUser } from './types';

// This is a new mock user added to simulate an admin.
export const adminUser: Omit<AdminUser, 'createdAt'> = {
    uid: 'Z4lmIcaur5ThncWj6x2rkae4sga2', // IMPORTANT: This UID must match the one you create in Firebase Auth
    fullName: 'Default Admin',
    email: 'admin@global-hrm.net',
    role: 'admin',
};

export const mockUsers: (Omit<User, 'subscription' | 'createdAt' | 'lastLogin'> & { subscription: Subscription; createdAt: Date; lastLogin: Date; })[] = [
    {
        uid: 'user_jane_doe',
        fullName: 'Jane Doe',
        email: 'jane.doe@example.com',
        profilePhotoURL: 'user-avatar-1',
        role: 'user',
        accountStatus: 'active',
        emailVerified: true,
        createdAt: new Date('2023-01-10'),
        lastLogin: new Date('2024-07-15'),
        subscription: {
            id: 'sub_jane_doe',
            userId: 'user_jane_doe',
            plan: 'pro',
            status: 'active',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2025-01-01'),
            paymentProvider: 'Stripe'
        }
    },
    {
        uid: 'user_john_smith',
        fullName: 'John Smith',
        email: 'john.smith@example.com',
        profilePhotoURL: 'user-avatar-2',
        role: 'user',
        accountStatus: 'active',
        emailVerified: true,
        createdAt: new Date('2023-02-20'),
        lastLogin: new Date('2024-07-14'),
        subscription: {
            id: 'sub_john_smith',
            userId: 'user_john_smith',
            plan: 'free',
            status: 'active',
            startDate: new Date('2023-02-20'),
            endDate: new Date('2099-01-01'),
            paymentProvider: 'Stripe'
        }
    },
];
