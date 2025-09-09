export interface BackendCompanion<T> {
  fromBackend(row: any): T | Error;
}
