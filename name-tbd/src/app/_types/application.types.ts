export interface Application {
  id: string;
  title: string;
  description: string;
  currentBranch: string;
  otherBranches: string[];
  lastModified: string;
  lastModifiedBy: string;
  isOccupied: boolean;
}
