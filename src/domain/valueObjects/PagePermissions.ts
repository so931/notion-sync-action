export type EditAccessLevel = 'none' | 'read' | 'comment' | 'edit' | 'full';

export class PagePermissions {
  constructor(private readonly editAccess: EditAccessLevel) {}

  getEditAccess(): EditAccessLevel {
    return this.editAccess;
  }

  isReadOnly(): boolean {
    return this.editAccess === 'none';
  }
}