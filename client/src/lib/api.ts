// API utility functions for plant management

// Response types
export interface InventoryCountResponse {
  count: number;
  message?: string;
}

export interface RenameResponse {
  message: string;
  plant: any;
}

/**
 * Fetches the inventory count for a given plant ID
 * @param plantId The ID of the plant
 * @returns Promise resolving to an InventoryCountResponse
 */
export async function getPlantInventoryCount(plantId: number): Promise<InventoryCountResponse> {
  try {
    const response = await fetch(`/api/plants/${plantId}/inventory-count`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Accept": "application/json",
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `Error fetching inventory count: ${response.status}`);
      (error as any).status = response.status;
      throw error;
    }

    return await response.json();
  } catch (error: any) {
    console.error("Error fetching inventory count:", error);
    throw error;
  }
}

/**
 * Renames a plant with optional force flag
 * @param plantId The ID of the plant to rename
 * @param newName The new name for the plant
 * @param forceRename Whether to force rename even if inventory exists
 * @returns Promise resolving to a RenameResponse
 */
export async function renamePlant(
  plantId: number, 
  newName: string, 
  forceRename: boolean = false
): Promise<RenameResponse> {
  try {
    const response = await fetch(`/api/plants/${plantId}`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ newName, forceRename })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `Error renaming plant: ${response.status}`);
      (error as any).status = response.status;
      throw error;
    }

    return await response.json();
  } catch (error: any) {
    console.error("Error renaming plant:", error);
    throw error;
  }
}