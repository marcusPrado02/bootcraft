/**
 * Generic repository port (domain interface).
 *
 * Implement this interface in src/infra/ to provide the actual storage adapter.
 * The domain layer must only import from this file, never from infra directly.
 */

export interface Repository<T, ID> {
  findById(id: ID): Promise<T | undefined>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
}

export interface PageRequest {
  page: number;
  pageSize: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PageableRepository<T, ID> extends Repository<T, ID> {
  findPage(request: PageRequest): Promise<Page<T>>;
}
