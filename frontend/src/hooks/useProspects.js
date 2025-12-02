/**
 * Prospects React Query Hooks
 *
 * Custom hooks for fetching and mutating prospect data using TanStack Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prospectService } from '../services/prospect.service';

/**
 * Fetch paginated prospects with filters
 * @param {object} filters - Query filters (per_page, connection_status, tag_id, search, page)
 * @returns {object} Query result with data, isLoading, error, etc.
 */
export const useProspects = (filters = {}) => {
  return useQuery({
    queryKey: ['prospects', filters],
    queryFn: () => prospectService.getProspects(filters),
    keepPreviousData: true, // Keep old data while fetching new page
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
};

/**
 * Fetch single prospect by ID
 * @param {number} id - Prospect ID
 * @returns {object} Query result
 */
export const useProspect = (id) => {
  return useQuery({
    queryKey: ['prospect', id],
    queryFn: () => prospectService.getProspect(id),
    enabled: !!id, // Only fetch if ID exists
  });
};

/**
 * Fetch prospect statistics
 * @returns {object} Query result with stats
 */
export const useProspectStats = () => {
  return useQuery({
    queryKey: ['prospect-stats'],
    queryFn: () => prospectService.getStats(),
  });
};

/**
 * Create new prospect mutation
 * @returns {object} Mutation object with mutate function
 */
export const useCreateProspect = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => prospectService.createProspect(data),
    onSuccess: () => {
      // Invalidate and refetch prospects list and stats
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['prospect-stats'] });
    },
  });
};

/**
 * Update prospect mutation
 * @returns {object} Mutation object with mutate function
 */
export const useUpdateProspect = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => prospectService.updateProspect(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific prospect and prospects list
      queryClient.invalidateQueries({ queryKey: ['prospect', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['prospect-stats'] });
    },
  });
};

/**
 * Delete prospect mutation
 * @returns {object} Mutation object with mutate function
 */
export const useDeleteProspect = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => prospectService.deleteProspect(id),
    onSuccess: () => {
      // Invalidate prospects list and stats
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['prospect-stats'] });
    },
  });
};

/**
 * Attach tags to prospect mutation
 * @returns {object} Mutation object with mutate function
 */
export const useAttachTags = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ prospectId, tagIds }) => prospectService.attachTags(prospectId, tagIds),
    onSuccess: (_, variables) => {
      // Invalidate specific prospect and prospects list
      queryClient.invalidateQueries({ queryKey: ['prospect', variables.prospectId] });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
    },
  });
};

/**
 * Detach tag from prospect mutation
 * @returns {object} Mutation object with mutate function
 */
export const useDetachTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ prospectId, tagId }) => prospectService.detachTag(prospectId, tagId),
    onSuccess: (_, variables) => {
      // Invalidate specific prospect and prospects list
      queryClient.invalidateQueries({ queryKey: ['prospect', variables.prospectId] });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
    },
  });
};
