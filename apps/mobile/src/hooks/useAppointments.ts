import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelMyAppointment,
  confirmMyAppointment,
  getMyAppointments,
} from "../lib/appointments-api";

export const useMyAppointments = (includePast: boolean = true) => {
  return useQuery({
    queryKey: ["appointments", "mine", includePast],
    queryFn: () => getMyAppointments(includePast),
    staleTime: 60 * 1000,
  });
};

export const useConfirmAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentId: string) => confirmMyAppointment(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", "mine"] });
    },
  });
};

export const useCancelAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentId: string) => cancelMyAppointment(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", "mine"] });
    },
  });
};
