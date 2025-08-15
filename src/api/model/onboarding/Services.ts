export class Services {
  id!: string;
  name!: string;
  parentId?: string;
  isCustom!: boolean;
  hasResponseTime!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<Services>) {
    Object.assign(this, partial);
  }
}