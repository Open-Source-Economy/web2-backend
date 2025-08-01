export interface CreateDeveloperProfileDto {
    // All user fields (name, email, githubUsername, termsAccepted) are now in app_user
    // This DTO can be empty or contain developer-specific fields if needed in the future
}

export interface UpdateDeveloperProfileDto {
    // All user fields (name, email, githubUsername) are now in app_user
    // This DTO can be empty or contain developer-specific fields if needed in the future
}