import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Download, RefreshCw, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import BackToMenuButton from "@/components/BackToMenuButton";

type EditableRow = {
  key: string; // stable react key
  name: string;
  scientificName: string;
  plantingYear: number;
  quantity: number;
  originalQuantity: number | null; // null for rows added manually
};

type Plant = {
  id: number;
  name: string;
  scientificName: string;
  plantingYear: number;
  quantity: number;
};

const DEFAULT_PERIOD = "06/2026 - 07/2027";
const buildTitle = (period: string) => `ΔΗΛΩΣΗ ΚΑΛΛΙΕΡΓΕΙΑΣ ΓΙΑ ${period}`.trim();

export default function CultivationDeclarationMaker() {
  const { toast } = useToast();
  const [period, setPeriod] = useState<string>(DEFAULT_PERIOD);
  const [excludeZero, setExcludeZero] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [rows, setRows] = useState<EditableRow[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Refs to each quantity input so Enter can jump straight to the next row.
  const quantityRefs = useRef<Array<HTMLInputElement | null>>([]);

  const { data: plants = [], isLoading, refetch, isFetching } = useQuery<Plant[]>({
    queryKey: ["/api/plants"],
    queryFn: async () => {
      const res = await fetch("/api/plants", { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to load plants: ${res.status}`);
      return res.json();
    },
  });

  const initialRows = useMemo<EditableRow[]>(() => {
    return plants.map((p) => ({
      key: `plant-${p.id}`,
      name: p.name,
      scientificName: p.scientificName,
      plantingYear: p.plantingYear,
      quantity: p.quantity,
      originalQuantity: p.quantity,
    }));
  }, [plants]);

  // Materialise rows on first successful load, but let user edits persist afterwards
  const workingRows = rows ?? initialRows;

  const updateRow = (key: string, patch: Partial<EditableRow>) => {
    setRows((prev) => (prev ?? initialRows).map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key: string) => {
    setRows((prev) => (prev ?? initialRows).filter((r) => r.key !== key));
  };

  const addRow = () => {
    const newRow: EditableRow = {
      key: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: "",
      scientificName: "",
      plantingYear: new Date().getFullYear(),
      quantity: 0,
      originalQuantity: null,
    };
    setRows((prev) => [newRow, ...(prev ?? initialRows)]);
  };

  const resetToCurrent = () => {
    setRows(null);
    toast({ title: "Reset", description: "Quantities reverted to current inventory values." });
  };

  const filteredRows = useMemo(() => {
    if (!search.trim()) return workingRows;
    const q = search.trim().toLowerCase();
    return workingRows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.scientificName.toLowerCase().includes(q),
    );
  }, [workingRows, search]);

  const totals = useMemo(() => {
    const includedRows = excludeZero ? workingRows.filter((r) => r.quantity > 0) : workingRows;
    const totalQty = includedRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const changedRows = workingRows.filter(
      (r) => r.originalQuantity !== null && r.quantity !== r.originalQuantity,
    ).length;
    const addedRows = workingRows.filter((r) => r.originalQuantity === null).length;
    return { rowCount: includedRows.length, totalQty, changedRows, addedRows };
  }, [workingRows, excludeZero]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const payload = {
        title: buildTitle(period),
        excludeZero,
        entries: workingRows.map((r) => ({
          name: r.name,
          scientificName: r.scientificName,
          plantingYear: r.plantingYear,
          quantity: r.quantity,
        })),
      };

      const res = await fetch("/api/plants/export/cultivation-declaration-custom", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      a.download = match?.[1] || `cultivation-declaration-${period.replace(/[^0-9A-Za-z]/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF generated",
        description: `${totals.rowCount} rows, total quantity ${totals.totalQty.toLocaleString()}.`,
      });
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Cultivation Declaration Maker | Plant Inventory System</title>
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        <BackToMenuButton />

        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cultivation Declaration Maker</h1>
            <p className="text-muted-foreground mt-1">
              Edit quantities and generate a cultivation declaration PDF for a custom period.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Report Settings</CardTitle>
            <CardDescription>Set the period shown in the PDF title.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Period</label>
              <Input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="06/2026 - 07/2027"
              />
              <p className="text-xs text-muted-foreground">
                Title: <span className="font-mono">{buildTitle(period)}</span>
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Search</label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by name or scientific name"
              />
            </div>

            <div className="flex flex-col justify-end gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="excludeZero"
                  checked={excludeZero}
                  onCheckedChange={(v) => setExcludeZero(v === true)}
                />
                <label htmlFor="excludeZero" className="text-sm">
                  Exclude zero-quantity rows from the PDF
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                {totals.rowCount} rows will be printed. Total quantity: {totals.totalQty.toLocaleString()}.
                {totals.changedRows > 0 && ` ${totals.changedRows} edited.`}
                {totals.addedRows > 0 && ` ${totals.addedRows} added.`}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || isLoading || workingRows.length === 0}
            className="transition-transform duration-100 ease-out active:scale-[0.98]"
          >
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating…" : "Generate PDF"}
          </Button>
          <Button
            variant="outline"
            onClick={addRow}
            className="transition-transform duration-100 ease-out active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add row
          </Button>
          <Button variant="outline" onClick={resetToCurrent} disabled={rows === null}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset quantities to inventory
          </Button>
          <Button variant="ghost" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Refreshing…" : "Reload inventory"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Entries</CardTitle>
            <CardDescription>
              Type the quantity for each plant, then press{" "}
              <kbd className="px-1.5 py-0.5 text-[11px] font-medium rounded border bg-muted">Enter</kbd>{" "}
              to jump to the next row. Name, scientific name and year edit on click. Sorting in the PDF
              is alphabetical, then by planting year.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading inventory…</div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <div className="max-h-[65vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-16">A/A</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Scientific Name</TableHead>
                        <TableHead className="w-24">Year</TableHead>
                        <TableHead className="w-32 text-right">Quantity</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map((row, index) => {
                        const changed =
                          row.originalQuantity !== null && row.quantity !== row.originalQuantity;
                        const added = row.originalQuantity === null;
                        return (
                          <TableRow
                            key={row.key}
                            className={
                              "group transition-colors " +
                              (changed || added
                                ? "bg-amber-50/70 dark:bg-amber-950/20"
                                : "hover:bg-muted/40")
                            }
                          >
                            <TableCell className="text-sm tabular-nums text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5">
                                {index + 1}
                                {added && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Added row" />
                                )}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={row.name}
                                onChange={(e) => updateRow(row.key, { name: e.target.value })}
                                placeholder="Όνομα φυτού"
                                className="h-9 px-2 ghost-input"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={row.scientificName}
                                onChange={(e) => updateRow(row.key, { scientificName: e.target.value })}
                                placeholder="Scientific name"
                                className="h-9 px-2 ghost-input italic text-muted-foreground focus:not-italic focus:text-foreground"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={row.plantingYear}
                                onChange={(e) =>
                                  updateRow(row.key, { plantingYear: parseInt(e.target.value) || 0 })
                                }
                                onFocus={(e) => e.currentTarget.select()}
                                className="h-9 w-20 px-2 ghost-input no-spinner tabular-nums"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                ref={(el) => (quantityRefs.current[index] = el)}
                                type="number"
                                min={0}
                                inputMode="numeric"
                                value={row.quantity}
                                onChange={(e) =>
                                  updateRow(row.key, { quantity: parseInt(e.target.value) || 0 })
                                }
                                onFocus={(e) => e.currentTarget.select()}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const nextEl = quantityRefs.current[index + (e.shiftKey ? -1 : 1)];
                                    if (nextEl) {
                                      nextEl.focus();
                                      nextEl.select();
                                    }
                                  }
                                }}
                                className="h-9 w-28 ml-auto text-right font-semibold tabular-nums no-spinner"
                              />
                              {changed && row.originalQuantity !== null && (
                                <div className="text-[10px] text-muted-foreground text-right mt-0.5 tabular-nums">
                                  was {row.originalQuantity.toLocaleString()}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeRow(row.key)}
                                title="Remove row"
                                className="h-8 w-8 text-muted-foreground transition-transform duration-100 ease-out hover:text-red-500 active:scale-90 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredRows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                            No rows match your filter.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
