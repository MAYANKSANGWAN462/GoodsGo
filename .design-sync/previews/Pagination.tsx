import { Pagination } from 'goods-go';

export function MiddlePage() {
  return <Pagination currentPage={5} totalPages={12} onPageChange={() => {}} />;
}

export function FirstPage() {
  return <Pagination currentPage={1} totalPages={8} onPageChange={() => {}} />;
}

export function LastPage() {
  return <Pagination currentPage={8} totalPages={8} onPageChange={() => {}} />;
}
