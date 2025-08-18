import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import BackToMenuButton from "@/components/BackToMenuButton";
import { PlantVarietyModal } from "@/components/PlantVarietyModal";

// Authentic species categories for ΠΥ8 compliance
const PLANT_SPECIES = [
  "ΛΕΜΟΝΟΔΕΝΤΡΑ",
  "ΦΡΟΥΤΟΔΕΝΤΡΑ"
];

// Authentic categories (suppliers) for ΠΥ8 compliance
const PLANT_CATEGORIES = [
  "Chrysovalantis Nursuries Ltd",
  "Νίκος Γ. Μωυσής",
  "Φυτώρια Παναγιώτου Λτδ",
  "Τμήμα Γεωργίας",
  "Φυτώρια Ανδρέα Χαραλάμπους",
  "T. N. Theodorides Nurseries Ltd"
];

// Schema for individual line items
const lineItemSchema = z.object({
  species: z.string().min(1, "Είδος είναι υποχρεωτικό"),
  variety: z.string().min(1, "Ποικιλία είναι υποχρεωτική"),
  quantity: z.number().min(1, "Ποσότητα πρέπει να είναι μεγαλύτερη από 0"),
  size: z.enum(["Μικρό", "Μεσαίο", "Μεγάλο"]).optional()
});

// Schema for the complete batch form
const batchPurchaseSchema = z.object({
  date: z.date({
    required_error: "Η ημερομηνία είναι υποχρεωτική",
  }),
  documentsOrigin: z.string().optional(),
  category: z.string().optional(),
  items: z.array(lineItemSchema).min(1, "Πρέπει να υπάρχει τουλάχιστον ένα προϊόν")
});

type BatchPurchaseForm = z.infer<typeof batchPurchaseSchema>;

interface PlantVariety {
  id: number;
  name: string;
  category?: string;
}

export default function Py8BatchPurchases() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [speciesSearchOpen, setSpeciesSearchOpen] = useState<number | null>(null);
  const [varietySearchOpen, setVarietySearchOpen] = useState<number | null>(null);
  const [categorySearchOpen, setCategorySearchOpen] = useState(false);

  // Fetch varieties from database
  const { data: varieties = [], isLoading: varietiesLoading } = useQuery<PlantVariety[]>({
    queryKey: ["/api/plant-varieties"],
  });

  const form = useForm<BatchPurchaseForm>({
    resolver: zodResolver(batchPurchaseSchema),
    defaultValues: {
      date: new Date(),
      documentsOrigin: "",
      category: "",
      items: [{ species: "", variety: "", quantity: 1, size: undefined }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const mutation = useMutation({
    mutationFn: async (data: BatchPurchaseForm) => {
      const response = await apiRequest("/api/purchases-py8/batch", "POST", {
        date: data.date.toISOString(),
        documentsOrigin: data.documentsOrigin,
        category: data.category,
        items: data.items
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Επιτυχία!",
        description: `Οι αγορές ΠΥ8 καταχωρήθηκαν επιτυχώς με αριθμό παραστατικού: ${data.invoiceNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases-py8"] });
      form.reset({
        date: new Date(),
        documentsOrigin: "",
        category: "",
        items: [{ species: "", variety: "", quantity: 1, size: undefined }]
      });
    },
    onError: (error: any) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία καταχώρησης αγορών",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: BatchPurchaseForm) => {
    mutation.mutate(values);
  };

  const addLineItem = () => {
    // Always start with empty values for better flexibility
    append({ species: "", variety: "", quantity: 1, size: undefined });
  };

  return (
    <div className="container mx-auto p-6">
      <BackToMenuButton />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Πολλαπλές Αγορές ΠΥ8 - Ένα Παραστατικό
          </CardTitle>
          <CardDescription>
            Καταχωρήστε πολλαπλά προϊόντα κάτω από ένα παραστατικό αγοράς
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Invoice Header Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Ημερομηνία *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>Επιλέξτε ημερομηνία</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="documentsOrigin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Συνοδευτικά Έγγραφα</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="π.χ. Δελτίο Αποστολής 0029" 
                          {...field} 
                          className="min-h-[38px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Κατηγορία (Προμηθευτής)</FormLabel>
                      <Popover open={categorySearchOpen} onOpenChange={setCategorySearchOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={categorySearchOpen}
                              className="w-full justify-between"
                            >
                              {field.value && field.value !== "no_category"
                                ? PLANT_CATEGORIES.find((category) => category === field.value) || field.value
                                : field.value === "no_category"
                                ? "Χωρίς κατηγορία"
                                : "Επιλέξτε προμηθευτή..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Αναζήτηση προμηθευτή ή πληκτρολογήστε νέο..." 
                              value={field.value === "no_category" ? "" : (field.value || "")}
                              onValueChange={(value) => {
                                if (value === "") {
                                  field.onChange("no_category");
                                } else {
                                  field.onChange(value);
                                }
                              }}
                            />
                            <CommandList>
                              <CommandEmpty>
                                <div className="p-2 text-sm">
                                  Δεν βρέθηκε προμηθευτής. Πατήστε Enter για να προσθέσετε "{field.value}"
                                </div>
                              </CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="no_category"
                                  onSelect={() => {
                                    field.onChange("no_category");
                                    setCategorySearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      field.value === "no_category" ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  Χωρίς κατηγορία
                                </CommandItem>
                                {PLANT_CATEGORIES.map((category) => (
                                  <CommandItem
                                    key={category}
                                    value={category}
                                    onSelect={() => {
                                      field.onChange(category);
                                      setCategorySearchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        field.value === category ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    {category}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Line Items Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Προϊόντα</h3>
                  <div className="flex gap-2">
                    <PlantVarietyModal />
                    <Button
                      type="button"
                      onClick={addLineItem}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Προσθήκη Γραμμής
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[25%]">Είδος *</TableHead>
                        <TableHead className="w-[25%]">Ποικιλία *</TableHead>
                        <TableHead className="w-[15%]">Ποσότητα *</TableHead>
                        <TableHead className="w-[20%]">Μέγεθος</TableHead>
                        <TableHead className="w-[15%]">Ενέργειες</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.species`}
                              render={({ field }) => (
                                <FormItem>
                                  <Popover 
                                    open={speciesSearchOpen === index} 
                                    onOpenChange={(open) => setSpeciesSearchOpen(open ? index : null)}
                                  >
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant="outline"
                                          role="combobox"
                                          className="w-full justify-between h-8 text-xs"
                                        >
                                          {field.value || "Επιλέξτε είδος..."}
                                          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                        </Button>
                                      </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                      <Command>
                                        <CommandInput 
                                          placeholder="Αναζήτηση είδους ή πληκτρολογήστε νέο..." 
                                          value={field.value || ""}
                                          onValueChange={field.onChange}
                                        />
                                        <CommandList>
                                          <CommandEmpty>
                                            <div className="p-2 text-sm">
                                              Δεν βρέθηκε είδος. Πατήστε Enter για να προσθέσετε "{field.value}"
                                            </div>
                                          </CommandEmpty>
                                          <CommandGroup>
                                            {PLANT_SPECIES.map((species) => (
                                              <CommandItem
                                                key={species}
                                                value={species}
                                                onSelect={() => {
                                                  field.onChange(species);
                                                  setSpeciesSearchOpen(null);
                                                }}
                                              >
                                                <Check
                                                  className={`mr-2 h-4 w-4 ${
                                                    field.value === species ? "opacity-100" : "opacity-0"
                                                  }`}
                                                />
                                                {species}
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.variety`}
                              render={({ field }) => (
                                <FormItem>
                                  <Popover 
                                    open={varietySearchOpen === index} 
                                    onOpenChange={(open) => setVarietySearchOpen(open ? index : null)}
                                  >
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant="outline"
                                          role="combobox"
                                          className="w-full justify-between h-8 text-xs"
                                        >
                                          {field.value || "Επιλέξτε ποικιλία..."}
                                          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                        </Button>
                                      </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                      <Command>
                                        <CommandInput 
                                          placeholder="Αναζήτηση ποικιλίας ή πληκτρολογήστε νέα..." 
                                          value={field.value || ""}
                                          onValueChange={field.onChange}
                                        />
                                        <CommandList>
                                          <CommandEmpty>
                                            <div className="p-2 text-sm">
                                              Δεν βρέθηκε ποικιλία. Πατήστε Enter για να προσθέσετε "{field.value}"
                                            </div>
                                          </CommandEmpty>
                                          <CommandGroup>
                                            {varieties.map((variety) => (
                                              <CommandItem
                                                key={variety.id}
                                                value={variety.name}
                                                onSelect={() => {
                                                  field.onChange(variety.name);
                                                  setVarietySearchOpen(null);
                                                }}
                                              >
                                                <Check
                                                  className={`mr-2 h-4 w-4 ${
                                                    field.value === variety.name ? "opacity-100" : "opacity-0"
                                                  }`}
                                                />
                                                {variety.name}
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      className="h-8"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.size`}
                              render={({ field }) => (
                                <FormItem>
                                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                                    <FormControl>
                                      <SelectTrigger className="h-8">
                                        <SelectValue placeholder="Επιλέξτε..." />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="Μικρό">Μικρό</SelectItem>
                                      <SelectItem value="Μεσαίο">Μεσαίο</SelectItem>
                                      <SelectItem value="Μεγάλο">Μεγάλο</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => remove(index)}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Submit Section */}
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => form.reset()}
                >
                  Καθαρισμός
                </Button>
                <Button 
                  type="submit" 
                  disabled={mutation.isPending}
                  className="min-w-[120px]"
                >
                  {mutation.isPending ? "Αποθήκευση..." : "Αποθήκευση Αγορών"}
                </Button>
              </div>

            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}