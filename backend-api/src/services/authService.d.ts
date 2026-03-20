export declare function loginService(email: string, password: string): Promise<{
    user: any;
    token: string;
}>;
export declare function registerService(email: string, password: string, name: string, role?: string): Promise<{
    user: any;
    token: string;
}>;
export declare function getUserService(id: string): Promise<any>;
//# sourceMappingURL=authService.d.ts.map