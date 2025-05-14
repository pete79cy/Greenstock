// API utility functions for plant management

import { apiRequest } from "./queryClient";

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
    const result = await apiRequest<InventoryCountResponse>({
      url: `/api/plants/${plantId}/inventory-count`,
      method: "GET",
      on401: "throw",
    });
    return result;
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
    const result = await apiRequest<RenameResponse>({
      url: `/api/plants/${plantId}`,
      method: "PUT",
      body: { newName, forceRename },
      on401: "throw",
    });
    return result;
  } catch (error: any) {
    console.error("Error renaming plant:", error);
    throw error;
  }
}