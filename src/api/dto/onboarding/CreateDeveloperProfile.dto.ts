export interface CreateDeveloperProfileDto {
    name: string;
    email: string;
    githubUsername?: string;
    termsAccepted: boolean;
}

export interface UpdateDeveloperProfileDto {
    name?: string;
    email?: string;
    githubUsername?: string;
}