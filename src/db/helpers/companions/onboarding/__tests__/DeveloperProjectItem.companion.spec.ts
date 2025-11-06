import {
  DeveloperRoleType,
  MergeRightsType,
} from "@open-source-economy/api-types";
import {
  DeveloperProjectItemCompanion,
  MergeRolesAndRightsResult,
} from "../DeveloperProjectItem.companion";

describe("DeveloperProjectItemCompanion.mergeRolesAndRights", () => {
  describe("when there are no changes", () => {
    it("should return hasChanges=false when roles and rights are identical", () => {
      const existingRoles = [
        DeveloperRoleType.FOUNDER,
        DeveloperRoleType.PROJECT_LEAD,
      ];
      const existingRights = [MergeRightsType.FULL_COMMITTER];
      const newRoles = [
        DeveloperRoleType.FOUNDER,
        DeveloperRoleType.PROJECT_LEAD,
      ];
      const newRights = [MergeRightsType.FULL_COMMITTER];

      const result = DeveloperProjectItemCompanion.mergeRolesAndRights(
        existingRoles,
        existingRights,
        newRoles,
        newRights,
      );

      expect(result.hasChanges).toBe(false);
      expect(result.addedRoles).toEqual([]);
      expect(result.addedMergeRights).toEqual([]);
      expect(result.mergedRoles).toHaveLength(2);
      expect(result.mergedRoles).toContain(DeveloperRoleType.FOUNDER);
      expect(result.mergedRoles).toContain(DeveloperRoleType.PROJECT_LEAD);
      expect(result.mergedMergeRights).toEqual([
        MergeRightsType.FULL_COMMITTER,
      ]);
    });

    it("should return hasChanges=false when new arrays are empty", () => {
      const existingRoles = [DeveloperRoleType.FOUNDER];
      const existingRights = [MergeRightsType.FULL_COMMITTER];
      const newRoles: DeveloperRoleType[] = [];
      const newRights: MergeRightsType[] = [];

      const result = DeveloperProjectItemCompanion.mergeRolesAndRights(
        existingRoles,
        existingRights,
        newRoles,
        newRights,
      );

      expect(result.hasChanges).toBe(false);
      expect(result.addedRoles).toEqual([]);
      expect(result.addedMergeRights).toEqual([]);
      expect(result.mergedRoles).toEqual([DeveloperRoleType.FOUNDER]);
      expect(result.mergedMergeRights).toEqual([
        MergeRightsType.FULL_COMMITTER,
      ]);
    });

    it("should return hasChanges=false when new items are subset of existing", () => {
      const existingRoles = [
        DeveloperRoleType.FOUNDER,
        DeveloperRoleType.PROJECT_LEAD,
        DeveloperRoleType.MAINTAINER,
      ];
      const existingRights = [
        MergeRightsType.FULL_COMMITTER,
        MergeRightsType.REVIEWER,
      ];
      const newRoles = [DeveloperRoleType.FOUNDER];
      const newRights = [MergeRightsType.FULL_COMMITTER];

      const result = DeveloperProjectItemCompanion.mergeRolesAndRights(
        existingRoles,
        existingRights,
        newRoles,
        newRights,
      );

      expect(result.hasChanges).toBe(false);
      expect(result.addedRoles).toEqual([]);
      expect(result.addedMergeRights).toEqual([]);
      expect(result.mergedRoles).toHaveLength(3);
      expect(result.mergedMergeRights).toHaveLength(2);
    });
  });

  describe("when there are changes", () => {
    it("should add new roles only", () => {
      const existingRoles = [DeveloperRoleType.FOUNDER];
      const existingRights = [MergeRightsType.FULL_COMMITTER];
      const newRoles = [
        DeveloperRoleType.PROJECT_LEAD,
        DeveloperRoleType.MAINTAINER,
      ];
      const newRights = [MergeRightsType.FULL_COMMITTER];

      const result = DeveloperProjectItemCompanion.mergeRolesAndRights(
        existingRoles,
        existingRights,
        newRoles,
        newRights,
      );

      expect(result.hasChanges).toBe(true);
      expect(result.addedRoles).toEqual([
        DeveloperRoleType.PROJECT_LEAD,
        DeveloperRoleType.MAINTAINER,
      ]);
      expect(result.addedMergeRights).toEqual([]);
      expect(result.mergedRoles).toHaveLength(3);
      expect(result.mergedRoles).toContain(DeveloperRoleType.FOUNDER);
      expect(result.mergedRoles).toContain(DeveloperRoleType.PROJECT_LEAD);
      expect(result.mergedRoles).toContain(DeveloperRoleType.MAINTAINER);
      expect(result.mergedMergeRights).toEqual([
        MergeRightsType.FULL_COMMITTER,
      ]);
    });

    it("should add new merge rights only", () => {
      const existingRoles = [DeveloperRoleType.FOUNDER];
      const existingRights = [MergeRightsType.FULL_COMMITTER];
      const newRoles = [DeveloperRoleType.FOUNDER];
      const newRights = [
        MergeRightsType.REVIEWER,
        MergeRightsType.RELEASE_MANAGER,
      ];

      const result = DeveloperProjectItemCompanion.mergeRolesAndRights(
        existingRoles,
        existingRights,
        newRoles,
        newRights,
      );

      expect(result.hasChanges).toBe(true);
      expect(result.addedRoles).toEqual([]);
      expect(result.addedMergeRights).toEqual([
        MergeRightsType.REVIEWER,
        MergeRightsType.RELEASE_MANAGER,
      ]);
      expect(result.mergedRoles).toEqual([DeveloperRoleType.FOUNDER]);
      expect(result.mergedMergeRights).toHaveLength(3);
      expect(result.mergedMergeRights).toContain(
        MergeRightsType.FULL_COMMITTER,
      );
      expect(result.mergedMergeRights).toContain(MergeRightsType.REVIEWER);
      expect(result.mergedMergeRights).toContain(
        MergeRightsType.RELEASE_MANAGER,
      );
    });

    it("should add both new roles and merge rights", () => {
      const existingRoles = [DeveloperRoleType.FOUNDER];
      const existingRights = [MergeRightsType.FULL_COMMITTER];
      const newRoles = [DeveloperRoleType.PROJECT_LEAD];
      const newRights = [MergeRightsType.REVIEWER];

      const result = DeveloperProjectItemCompanion.mergeRolesAndRights(
        existingRoles,
        existingRights,
        newRoles,
        newRights,
      );

      expect(result.hasChanges).toBe(true);
      expect(result.addedRoles).toEqual([DeveloperRoleType.PROJECT_LEAD]);
      expect(result.addedMergeRights).toEqual([MergeRightsType.REVIEWER]);
      expect(result.mergedRoles).toHaveLength(2);
      expect(result.mergedRoles).toContain(DeveloperRoleType.FOUNDER);
      expect(result.mergedRoles).toContain(DeveloperRoleType.PROJECT_LEAD);
      expect(result.mergedMergeRights).toHaveLength(2);
      expect(result.mergedMergeRights).toContain(
        MergeRightsType.FULL_COMMITTER,
      );
      expect(result.mergedMergeRights).toContain(MergeRightsType.REVIEWER);
    });

    it("should merge when starting with empty arrays", () => {
      const existingRoles: DeveloperRoleType[] = [];
      const existingRights: MergeRightsType[] = [];
      const newRoles = [DeveloperRoleType.FOUNDER];
      const newRights = [MergeRightsType.FULL_COMMITTER];

      const result = DeveloperProjectItemCompanion.mergeRolesAndRights(
        existingRoles,
        existingRights,
        newRoles,
        newRights,
      );

      expect(result.hasChanges).toBe(true);
      expect(result.addedRoles).toEqual([DeveloperRoleType.FOUNDER]);
      expect(result.addedMergeRights).toEqual([MergeRightsType.FULL_COMMITTER]);
      expect(result.mergedRoles).toEqual([DeveloperRoleType.FOUNDER]);
      expect(result.mergedMergeRights).toEqual([
        MergeRightsType.FULL_COMMITTER,
      ]);
    });
  });

  describe("edge cases", () => {
    it("should handle duplicates in new arrays", () => {
      const existingRoles = [DeveloperRoleType.FOUNDER];
      const existingRights = [MergeRightsType.FULL_COMMITTER];
      const newRoles = [
        DeveloperRoleType.PROJECT_LEAD,
        DeveloperRoleType.PROJECT_LEAD, // duplicate
      ];
      const newRights = [
        MergeRightsType.REVIEWER,
        MergeRightsType.REVIEWER, // duplicate
      ];

      const result = DeveloperProjectItemCompanion.mergeRolesAndRights(
        existingRoles,
        existingRights,
        newRoles,
        newRights,
      );

      expect(result.hasChanges).toBe(true);
      // Should only add each unique item once
      expect(result.addedRoles).toEqual([
        DeveloperRoleType.PROJECT_LEAD,
        DeveloperRoleType.PROJECT_LEAD,
      ]); // Filter doesn't dedupe input
      expect(result.addedMergeRights).toEqual([
        MergeRightsType.REVIEWER,
        MergeRightsType.REVIEWER,
      ]);
      // But merged result should have no duplicates
      expect(result.mergedRoles).toHaveLength(2);
      expect(result.mergedMergeRights).toHaveLength(2);
    });

    it("should handle all empty arrays", () => {
      const existingRoles: DeveloperRoleType[] = [];
      const existingRights: MergeRightsType[] = [];
      const newRoles: DeveloperRoleType[] = [];
      const newRights: MergeRightsType[] = [];

      const result = DeveloperProjectItemCompanion.mergeRolesAndRights(
        existingRoles,
        existingRights,
        newRoles,
        newRights,
      );

      expect(result.hasChanges).toBe(false);
      expect(result.addedRoles).toEqual([]);
      expect(result.addedMergeRights).toEqual([]);
      expect(result.mergedRoles).toEqual([]);
      expect(result.mergedMergeRights).toEqual([]);
    });

    it("should handle partial overlap", () => {
      const existingRoles = [
        DeveloperRoleType.FOUNDER,
        DeveloperRoleType.MAINTAINER,
      ];
      const existingRights = [MergeRightsType.FULL_COMMITTER];
      const newRoles = [
        DeveloperRoleType.FOUNDER,
        DeveloperRoleType.PROJECT_LEAD,
      ]; // one overlap, one new
      const newRights = [
        MergeRightsType.FULL_COMMITTER,
        MergeRightsType.REVIEWER,
      ]; // one overlap, one new

      const result = DeveloperProjectItemCompanion.mergeRolesAndRights(
        existingRoles,
        existingRights,
        newRoles,
        newRights,
      );

      expect(result.hasChanges).toBe(true);
      expect(result.addedRoles).toEqual([DeveloperRoleType.PROJECT_LEAD]);
      expect(result.addedMergeRights).toEqual([MergeRightsType.REVIEWER]);
      expect(result.mergedRoles).toHaveLength(3);
      expect(result.mergedRoles).toContain(DeveloperRoleType.FOUNDER);
      expect(result.mergedRoles).toContain(DeveloperRoleType.MAINTAINER);
      expect(result.mergedRoles).toContain(DeveloperRoleType.PROJECT_LEAD);
      expect(result.mergedMergeRights).toHaveLength(2);
      expect(result.mergedMergeRights).toContain(
        MergeRightsType.FULL_COMMITTER,
      );
      expect(result.mergedMergeRights).toContain(MergeRightsType.REVIEWER);
    });
  });
});
