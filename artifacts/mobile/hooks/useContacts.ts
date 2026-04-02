import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateContactInput,
  UpdateContactInput,
  CreateActionInput,
  UpdateActionInput,
  Contact,
  Action,
} from "@workspace/api-client-react";
import {
  getAllContacts,
  getContactById,
  insertContact,
  updateContactInDb,
  softDeleteContact,
  getAllActions,
  insertAction,
  updateActionInDb,
  softDeleteAction,
  getNextLocalId,
} from "@/lib/database";
import { enqueueMutation } from "@/lib/sync-queue";
import { requestSync } from "@/lib/sync-manager";

export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: () => getAllContacts(),
  });
}

export function useContact(id: number) {
  return useQuery({
    queryKey: ["contacts", id],
    queryFn: () => getContactById(id),
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateContactInput): Contact => {
      const localId = getNextLocalId();
      const contact = insertContact({
        id: localId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status,
        notes: data.notes,
        propertyType: data.propertyType,
        localOnly: true,
      });
      enqueueMutation("contact", localId, "create", {
        name: data.name,
        phone: data.phone ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status,
        notes: data.notes ?? null,
        propertyType: data.propertyType ?? null,
      });
      requestSync();
      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateContactInput }): Contact | null => {
      const updated = updateContactInDb(id, data as Record<string, unknown>);
      enqueueMutation("contact", id, "update", data as Record<string, unknown>);
      requestSync();
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number): void => {
      softDeleteContact(id);
      enqueueMutation("contact", id, "delete");
      requestSync();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
  });
}

export function useActions(contactId?: number) {
  return useQuery({
    queryKey: ["actions", contactId],
    queryFn: () => getAllActions(contactId),
  });
}

export function useCreateAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateActionInput): Action => {
      const localId = getNextLocalId();
      const action = insertAction({
        id: localId,
        contactId: data.contactId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        actionType: data.actionType,
        localOnly: true,
      });
      enqueueMutation("action", localId, "create", {
        contactId: data.contactId,
        title: data.title,
        description: data.description ?? null,
        dueDate: data.dueDate ?? null,
        actionType: data.actionType,
      });
      requestSync();
      return action;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
  });
}

export function useUpdateAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateActionInput }): Action | null => {
      const updated = updateActionInDb(id, data as Record<string, unknown>);
      enqueueMutation("action", id, "update", data as Record<string, unknown>);
      requestSync();
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
  });
}

export function useDeleteAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number): void => {
      softDeleteAction(id);
      enqueueMutation("action", id, "delete");
      requestSync();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
  });
}
