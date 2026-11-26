'use client';

import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState
} from '@tanstack/react-table';
import { STAGES, STAGE_LABELS, type Job, type Stage } from '@/lib/types';
import { daysUntilDue, dueLabel, dueState, formatSize, VIEWS, type ViewId } from '@/lib/jobs';
import { myWork } from '@/lib/roles';
import { useShop } from '@/lib/shop';
import { StageChip } from './StageChip';
import styles from './JobsTable.module.css';

export type JobRow = Job & { customer: string; designer?: string };

const col = createColumnHelper<JobRow>();

export function JobsTable() {
  const { jobs, today, customerName, staffName, role, me } = useShop();
  const mine = useMemo(() => myWork(role, me), [role, me]);
  type View = { id: ViewId | 'mine'; label: string; description: string; test: (job: Job, today: string) => boolean };
  const views: View[] = useMemo(() => (mine ? [{ id: 'mine' as const, ...mine, test: (j: Job) => mine.test(j) }, ...VIEWS] : VIEWS), [mine]);
  // Flatten names onto the rows so search and sorting work on what people actually read.
  const rows: JobRow[] = useMemo(
    () => jobs.map((job) => ({ ...job, customer: customerName(job.customerId), designer: staffName(job.designerId) })),
    [jobs, customerName, staffName]
  );
  const [view, setView] = useState<ViewId | 'mine'>(mine ? 'mine' : 'open');
  const [viewRole, setViewRole] = useState(role);
  if (viewRole !== role) {
    // A new role opens on its own work.
    setViewRole(role);
    setView(mine ? 'mine' : 'open');
  }
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<Stage | 'any'>('any');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'due', desc: false }]);

  const counts = useMemo(
    () => Object.fromEntries(views.map((v) => [v.id, rows.filter((j) => v.test(j, today)).length])) as Record<ViewId | 'mine', number>,
    [rows, today, views]
  );

  const data = useMemo(() => {
    const def = views.find((v) => v.id === view) ?? views[0]!;
    const shown = rows.filter((j) => def.test(j, today));
    return stage === 'any' ? shown : shown.filter((r) => r.stage === stage);
  }, [rows, view, stage, today, views]);

  const columns = useMemo(
    () => [
      col.accessor('id', {
        header: 'Job',
        cell: (info) => <span className="mono">{info.getValue()}</span>,
        sortingFn: 'alphanumeric'
      }),
      col.accessor((r) => `${r.title} ${r.customer}`, {
        id: 'title',
        header: 'Title / customer',
        cell: ({ row }) => (
          <div className={styles.titleCell}>
            <span className={styles.title}>
              {row.original.title}
              {row.original.rush && <span className={styles.rush}>Rush</span>}
            </span>
            <span className={styles.sub}>{row.original.customer}</span>
          </div>
        ),
        sortingFn: (a, b) => a.original.customer.localeCompare(b.original.customer)
      }),
      col.accessor('product', {
        header: 'Product',
        cell: ({ row }) => (
          <div className={styles.titleCell}>
            <span>{row.original.product}</span>
            <span className={styles.sub}>
              {formatSize(row.original)} · qty {row.original.quantity}
            </span>
          </div>
        )
      }),
      col.accessor((r) => STAGES.indexOf(r.stage), {
        id: 'stage',
        header: 'Stage',
        cell: ({ row }) => <StageChip stage={row.original.stage} />
      }),
      col.accessor((r) => r.proofs.length, {
        id: 'proofs',
        header: 'Proofs',
        cell: (info) => {
          const n = info.getValue();
          return n === 0 ? <span className={styles.sub}>None yet</span> : <span>{n === 1 ? '1 round' : `${n} rounds`}</span>;
        }
      }),
      col.accessor((r) => daysUntilDue(r, today), {
        id: 'due',
        header: 'Due',
        cell: ({ row }) => (
          <span className={styles.due} data-state={dueState(row.original, today)}>
            {dueLabel(row.original, today)}
          </span>
        )
      }),
      col.accessor((r) => r.designer ?? '', {
        id: 'designer',
        header: 'Designer',
        cell: (info) => info.getValue() || <span className={styles.sub}>Unassigned</span>
      })
    ],
    [today]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: query },
    onSortingChange: setSorting,
    onGlobalFilterChange: setQuery,
    globalFilterFn: (row, _columnId, value: string) => {
      const q = value.trim().toLowerCase();
      if (!q) return true;
      const r = row.original;
      return [r.id, r.title, r.customer, r.product, r.material, r.designer ?? ''].some((s) => s.toLowerCase().includes(q));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  });

  const visible = table.getRowModel().rows;
  const activeView = views.find((v) => v.id === view) ?? views[0]!;

  return (
    <section aria-labelledby="jobs-heading" className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className="label">Copperline Signs &amp; Print</p>
          <h1 id="jobs-heading">Jobs</h1>
        </div>
        <p className={styles.summary}>
          <strong>{counts.open}</strong> open · <strong className={styles.lateCount}>{counts.late}</strong> late ·{' '}
          <strong>{counts.waiting}</strong> waiting on customers
        </p>
      </header>

      <div className={styles.views} role="group" aria-label="Saved views">
        {views.map((v) => (
          <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)} title={v.description}>
            {v.label} <span className={styles.count}>{counts[v.id]}</span>
          </button>
        ))}
      </div>

      <div className={styles.tools}>
        <label className={styles.field}>
          <span className="label">Search</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Job number, customer, product…" />
        </label>
        <label className={styles.field}>
          <span className="label">Stage</span>
          <select value={stage} onChange={(e) => setStage(e.target.value as Stage | 'any')}>
            <option value="any">Any stage</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>{STAGE_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <p className={styles.result} role="status" aria-live="polite">
          {visible.length} {visible.length === 1 ? 'job' : 'jobs'} in “{activeView.label}”
        </p>
      </div>

      <div className={styles.frame}>
        <table className={styles.table}>
          <caption className="visually-hidden">
            {activeView.label}: {visible.length} jobs. Column headers sort the table.
          </caption>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th key={header.id} scope="col" aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}>
                      <button type="button" onClick={header.column.getToggleSortingHandler()} className={styles.sort}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span aria-hidden="true" className={styles.arrow}>{sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '↕'}</span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} data-late={dueState(row.original, today) === 'late' || undefined}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} data-label={typeof cell.column.columnDef.header === 'string' ? cell.column.columnDef.header : ''}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className={styles.empty}>
            <h2>No jobs match</h2>
            <p>Nothing in “{activeView.label}” matches {query ? `“${query}”` : 'that stage'}. Clear the search or pick another view.</p>
            <button type="button" onClick={() => { setQuery(''); setStage('any'); }}>Clear filters</button>
          </div>
        )}
      </div>
    </section>
  );
}
