import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { lineAmountCents } from '../../domain/calc';
import { emptyItem, toLenientItem, type FormItem, type FormValues } from '../../domain/form';
import { LIMITS } from '../../domain/limits';
import { formatCents } from '../../domain/money';
import { UNITS, type DocumentData } from '../../domain/types';
import { Corners } from '../../ui/Corners';
import { DownIcon, GripIcon, PlusIcon, TrashIcon, UndoIcon, UpIcon } from '../../ui/Icons';
import { errorAt, Field, FieldError, invalidProps, SectionTitle } from './fields';

type Form = UseFormReturn<FormValues, unknown, DocumentData>;

const UNDO_MS = 10_000;

function amountOf(item: FormItem): string {
  return formatCents(lineAmountCents(toLenientItem(item)));
}

function UnitOptions() {
  return (
    <>
      {UNITS.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </>
  );
}

export function ItemsEditor({
  form,
  desktop,
  totalLabel,
}: {
  form: Form;
  desktop: boolean;
  totalLabel: string;
}) {
  const { control, watch, formState, setFocus, clearErrors } = form;
  const { fields, append, remove, move, insert } = useFieldArray({
    control,
    name: 'items',
    keyName: 'key',
  });
  const items = watch('items');
  const errors = formState.errors;
  const [undo, setUndo] = useState<{ item: FormItem; index: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const undoButton = useRef<HTMLButtonElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  const add = () => {
    const n = fields.length;
    append(emptyItem(), { shouldFocus: false });
    setTimeout(() => {
      // A new, untouched item is not an error yet, even after a failed "Ver PDF".
      clearErrors(`items.${n}`);
      setFocus(`items.${n}.description`);
    }, 0);
  };

  const del = (index: number) => {
    const item = items[index];
    if (!item) return;
    remove(index);
    clearTimeout(timer.current);
    setUndo({ item, index });
    // Keep keyboard and screen-reader users in place: focus moves to "Deshacer".
    setTimeout(() => undoButton.current?.focus(), 0);
    timer.current = setTimeout(() => {
      if (document.activeElement === undoButton.current) addButton.current?.focus();
      setUndo(null);
    }, UNDO_MS);
  };

  const doUndo = () => {
    if (!undo) return;
    clearTimeout(timer.current);
    insert(Math.min(undo.index, fields.length), undo.item);
    setUndo(null);
  };

  const listError = errorAt(errors, 'items.root') ?? errorAt(errors, 'items');
  const full = fields.length >= LIMITS.maxItems;
  const countLabel = fields.length === 1 ? '1 partida' : `${String(fields.length)} partidas`;

  const undoToast = undo && (
    <div
      role="status"
      className={
        desktop
          ? 'flex min-w-0 items-center gap-1 bg-ink pl-3.5 text-white'
          : 'fixed right-3 bottom-[calc(96px+env(safe-area-inset-bottom))] left-3 z-20 flex items-center justify-between border-2 border-walnut-900 bg-surface pr-1 pl-4 text-ink shadow-[0_12px_32px_rgba(31,23,18,0.35)]'
      }
    >
      <span className="min-w-0 truncate text-base">
        {undo.item.description.trim()
          ? `“${undo.item.description.trim()}” eliminada`
          : `Partida #${String(undo.index + 1)} eliminada`}
      </span>
      <button
        ref={undoButton}
        type="button"
        onClick={doUndo}
        className={`flex min-h-12 flex-none items-center gap-1.5 px-3.5 text-base font-bold tracking-[0.04em] uppercase ${desktop ? 'text-orange-400' : 'text-orange-800'}`}
      >
        <UndoIcon size={20} />
        Deshacer
      </button>
    </div>
  );

  const empty = fields.length === 0 && (
    <div className="flex flex-col items-center gap-3 border-[1.5px] border-dashed border-field px-4 py-6 text-center">
      <span className="text-[17px] font-semibold">Aún no hay partidas</span>
      <span className="text-[15px] text-ink-muted">
        Agrega lo que vas a cobrar: piso, escaleras, material.
      </span>
      <button
        type="button"
        onClick={add}
        className="btn-cond flex min-h-[52px] items-center justify-center gap-2 self-stretch bg-orange-700 text-xl text-white hover:bg-orange-800"
      >
        <PlusIcon /> Agregar primera partida
      </button>
    </div>
  );

  if (desktop) {
    return (
      <section className="flex flex-col gap-3" aria-labelledby="items-title">
        <div id="items-title">
          <SectionTitle n="04">Partidas</SectionTitle>
        </div>
        <FieldError path="items" message={listError} />
        {fields.length === 0 ? (
          <>
            {empty}
            {undo && <div className="self-start">{undoToast}</div>}
          </>
        ) : (
          <div className="blueprint border border-line bg-surface">
            <Corners />
            <div className="items-grid h-10 items-center bg-walnut-900 px-2 text-[13px] font-bold tracking-[0.06em] text-white uppercase">
              <span />
              <span>Descripción</span>
              <span className="text-right">Cant.</span>
              <span className="pl-2">Unidad</span>
              <span className="text-right">Precio</span>
              <span className="text-right">Monto</span>
              <span />
            </div>
            <ol className="m-0 list-none p-0">
              {fields.map((field, index) => (
                <DesktopRow
                  key={field.key}
                  form={form}
                  index={index}
                  count={fields.length}
                  item={items[index] ?? field}
                  onMove={(to) => {
                    if (to >= 0 && to < fields.length) move(index, to);
                  }}
                  onDelete={() => {
                    del(index);
                  }}
                  onDropFrom={(from) => {
                    move(from, index);
                  }}
                />
              ))}
            </ol>
            <div className="flex items-center justify-between gap-3 p-2">
              <button
                ref={addButton}
                type="button"
                onClick={add}
                disabled={full}
                className="min-h-12 flex-none rounded-field border-[1.5px] border-walnut-700 bg-surface px-4 text-base font-semibold text-walnut-700 hover:bg-cream disabled:opacity-50"
              >
                + Agregar partida
              </button>
              {undoToast}
              <span className="font-cond text-[26px] font-bold tabular-nums">
                Total {totalLabel}
              </span>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="items-title-m">
      <div id="items-title-m">
        <SectionTitle n="04" aside={fields.length > 0 ? countLabel : undefined}>
          Partidas
        </SectionTitle>
      </div>
      <FieldError path="items" message={listError} />
      {empty}
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {fields.map((field, index) => (
          <MobileCard
            key={field.key}
            form={form}
            index={index}
            count={fields.length}
            item={items[index] ?? field}
            onMove={(to) => {
              if (to >= 0 && to < fields.length) move(index, to);
            }}
            onDelete={() => {
              del(index);
            }}
          />
        ))}
      </ol>
      {fields.length > 0 && (
        <button
          ref={addButton}
          type="button"
          onClick={add}
          disabled={full}
          className="btn-cond flex min-h-[52px] items-center justify-center gap-2 rounded-field border-[1.5px] border-walnut-700 bg-surface text-xl text-walnut-700 hover:bg-cream disabled:opacity-50"
        >
          <PlusIcon /> Agregar partida
        </button>
      )}
      {full && <span className="text-sm text-ink-muted">Máximo {LIMITS.maxItems} partidas.</span>}
      {undoToast}
    </section>
  );
}

interface RowProps {
  form: Form;
  index: number;
  count: number;
  item: FormItem;
  onMove: (to: number) => void;
  onDelete: () => void;
}

function MobileCard({ form, index, count, item, onMove, onDelete }: RowProps) {
  const { register, formState } = form;
  const p = (f: keyof FormItem) => `items.${index}.${f}` as const;
  const err = (f: keyof FormItem) => errorAt(formState.errors, p(f));
  const lump = item.unit === 'lump sum';
  const hasError = (['description', 'otherUnit', 'qty', 'unitPrice', 'lumpSum'] as const).some(
    (f) => err(f),
  );

  return (
    <li
      className={`blueprint flex flex-col bg-surface ${hasError ? 'border-2 border-error' : 'border border-line'}`}
      aria-label={`Partida ${String(index + 1)}`}
    >
      <Corners />
      <div
        className={`flex items-center gap-1 border-b border-line-faint pl-3 ${hasError ? 'bg-error-bg' : 'bg-paper'}`}
      >
        <span
          className={`flex-1 font-cond text-xl font-bold ${hasError ? 'text-error' : 'text-orange-800'}`}
        >
          #{index + 1}
        </span>
        <button
          type="button"
          aria-label={`Subir partida ${String(index + 1)}`}
          onClick={() => {
            onMove(index - 1);
          }}
          disabled={index === 0}
          className="grid size-12 place-items-center text-walnut-700 disabled:opacity-30"
        >
          <UpIcon size={24} />
        </button>
        <button
          type="button"
          aria-label={`Bajar partida ${String(index + 1)}`}
          onClick={() => {
            onMove(index + 1);
          }}
          disabled={index === count - 1}
          className="grid size-12 place-items-center text-walnut-700 disabled:opacity-30"
        >
          <DownIcon size={24} />
        </button>
        <button
          type="button"
          aria-label={`Eliminar partida ${String(index + 1)}`}
          onClick={onDelete}
          className="grid size-12 place-items-center border-l border-line-faint text-error"
        >
          <TrashIcon />
        </button>
      </div>
      <div className="flex flex-col gap-3 p-3">
        <Field label="Descripción" path={p('description')} error={err('description')}>
          <textarea
            rows={2}
            maxLength={200}
            className="field"
            {...invalidProps(p('description'), err('description'))}
            {...register(p('description'))}
          />
        </Field>
        <Field label="Unidad" path={p('unit')} error={undefined}>
          <select className="field px-2.5" {...register(p('unit'))}>
            <UnitOptions />
          </select>
        </Field>
        {item.unit === 'other' && (
          <Field label="Escribe la unidad" path={p('otherUnit')} error={err('otherUnit')}>
            <input
              className="field"
              placeholder="ej. rooms"
              maxLength={15}
              {...invalidProps(p('otherUnit'), err('otherUnit'))}
              {...register(p('otherUnit'))}
            />
          </Field>
        )}
        {lump ? (
          <Field label="Monto total $" path={p('lumpSum')} error={err('lumpSum')}>
            <input
              inputMode="decimal"
              autoComplete="off"
              maxLength={20}
              className="field num text-[19px] font-semibold"
              {...invalidProps(p('lumpSum'), err('lumpSum'))}
              {...register(p('lumpSum'))}
            />
          </Field>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cantidad" path={p('qty')} error={err('qty')}>
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  maxLength={20}
                  className="field num"
                  {...invalidProps(p('qty'), err('qty'))}
                  {...register(p('qty'))}
                />
              </Field>
              <Field
                label={`Precio por ${item.unit === 'other' ? item.otherUnit.trim() || 'unidad' : item.unit} $`}
                path={p('unitPrice')}
                error={err('unitPrice')}
              >
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  maxLength={20}
                  className="field num"
                  {...invalidProps(p('unitPrice'), err('unitPrice'))}
                  {...register(p('unitPrice'))}
                />
              </Field>
            </div>
            <div className="flex items-baseline justify-between border-t border-dashed border-line pt-2.5">
              <span className="text-[15px] font-semibold text-ink-muted">Monto</span>
              <span className="font-cond text-2xl font-bold tabular-nums">{amountOf(item)}</span>
            </div>
          </>
        )}
      </div>
    </li>
  );
}

function DesktopRow({
  form,
  index,
  count,
  item,
  onMove,
  onDelete,
  onDropFrom,
}: RowProps & { onDropFrom: (from: number) => void }) {
  const { register, formState } = form;
  const p = (f: keyof FormItem) => `items.${index}.${f}` as const;
  const err = (f: keyof FormItem) => errorAt(formState.errors, p(f));
  const lump = item.unit === 'lump sum';
  const [dragOver, setDragOver] = useState(false);
  const messages = (['description', 'otherUnit', 'qty', 'unitPrice', 'lumpSum'] as const)
    .map((f) => ({ f, m: err(f) }))
    .filter((x): x is { f: (typeof x)['f']; m: string } => Boolean(x.m));

  const onHandleKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      onMove(index - 1);
    } else if (e.key === 'ArrowDown' && index < count - 1) {
      e.preventDefault();
      onMove(index + 1);
    }
  };

  return (
    <li
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => {
        setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const from = Number(e.dataTransfer.getData('text/plain'));
        if (Number.isInteger(from) && from !== index) onDropFrom(from);
      }}
      className={`border-b border-line-faint p-2 hover:bg-paper-hover ${dragOver ? 'bg-orange-100' : ''}`}
    >
      <div className="items-grid items-center">
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(index));
          }}
          onKeyDown={onHandleKey}
          aria-label={`Mover partida ${String(index + 1)} (flechas arriba y abajo)`}
          title="Arrastra para reordenar"
          className="grid h-12 cursor-grab place-items-center text-field"
        >
          <GripIcon size={20} />
        </button>
        <textarea
          aria-label={`Descripción partida ${String(index + 1)}`}
          rows={1}
          maxLength={200}
          className="field min-h-12 resize-none px-2.5 text-base field-sizing-content"
          {...invalidProps(p('description'), err('description'))}
          {...register(p('description'))}
        />
        {lump ? (
          <input
            aria-label={`Cantidad partida ${String(index + 1)}`}
            value="—"
            disabled
            className="field num px-2.5 text-base"
          />
        ) : (
          <input
            aria-label={`Cantidad partida ${String(index + 1)}`}
            inputMode="decimal"
            autoComplete="off"
            maxLength={20}
            className="field num px-2.5 text-base"
            {...invalidProps(p('qty'), err('qty'))}
            {...register(p('qty'))}
          />
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <select
            aria-label={`Unidad partida ${String(index + 1)}`}
            className="field px-1.5 text-base"
            {...register(p('unit'))}
          >
            <UnitOptions />
          </select>
          {item.unit === 'other' && (
            <input
              aria-label={`Unidad escrita partida ${String(index + 1)}`}
              placeholder="ej. rooms"
              maxLength={15}
              className="field px-2.5 text-base"
              {...invalidProps(p('otherUnit'), err('otherUnit'))}
              {...register(p('otherUnit'))}
            />
          )}
        </div>
        {lump ? (
          <input
            aria-label={`Precio partida ${String(index + 1)}`}
            value="—"
            disabled
            className="field num px-2.5 text-base"
          />
        ) : (
          <input
            aria-label={`Precio partida ${String(index + 1)}`}
            inputMode="decimal"
            autoComplete="off"
            maxLength={20}
            className="field num px-2.5 text-base"
            {...invalidProps(p('unitPrice'), err('unitPrice'))}
            {...register(p('unitPrice'))}
          />
        )}
        {lump ? (
          <input
            aria-label={`Monto partida ${String(index + 1)}`}
            inputMode="decimal"
            autoComplete="off"
            maxLength={20}
            className="field num border-ink px-2.5 text-base font-semibold"
            {...invalidProps(p('lumpSum'), err('lumpSum'))}
            {...register(p('lumpSum'))}
          />
        ) : (
          <span className="text-right text-[17px] font-bold tabular-nums">{amountOf(item)}</span>
        )}
        <button
          type="button"
          aria-label={`Eliminar partida ${String(index + 1)}`}
          onClick={onDelete}
          className="grid size-12 place-items-center text-error hover:bg-error-bg"
        >
          <TrashIcon size={20} />
        </button>
      </div>
      {messages.length > 0 && (
        <div className="flex flex-wrap gap-x-4 pt-1 pl-[34px]">
          {messages.map(({ f, m }) => (
            <FieldError key={f} path={p(f)} message={m} />
          ))}
        </div>
      )}
    </li>
  );
}
