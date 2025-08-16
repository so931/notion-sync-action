import { PagePermissions } from '../../../../src/domain/valueObjects/PagePermissions';

describe('PagePermissions', () => {
  describe('constructor', () => {
    it('should create permissions with edit access level', () => {
      // Arrange & Act
      const permissions = new PagePermissions('none');
      
      // Assert
      expect(permissions.getEditAccess()).toBe('none');
    });
  });

  describe('isReadOnly', () => {
    it('should return true when edit access is none', () => {
      // Arrange
      const permissions = new PagePermissions('none');
      
      // Act
      const isReadOnly = permissions.isReadOnly();
      
      // Assert
      expect(isReadOnly).toBe(true);
    });

    it.each([
      ['read'],
      ['comment'],
      ['edit'],
      ['full']
    ])('should return false when edit access is %s', (access) => {
      // Arrange
      const permissions = new PagePermissions(access as any);
      
      // Act
      const isReadOnly = permissions.isReadOnly();
      
      // Assert
      expect(isReadOnly).toBe(false);
    });
  });
});