import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelMyAppointment,
  confirmMyAppointment,
  getMyAppointments,
} from "../lib/appointments-api";
import { useSocket } from "./useSocket";

const useAppointmentRealtimeSync = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleAppointmentEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", "mine"] });
    };

    socket.on("appointment:updated", handleAppointmentEvent);
    socket.on("appointment:reminder", handleAppointmentEvent);

    return () => {
      socket.off("appointment:updated", handleAppointmentEvent);
      socket.off("appointment:reminder", handleAppointmentEvent);
    };
  }, [queryClient, socket]);
};

export const useMyAppointments = (includePast: boolean = true) => {
  useAppointmentRealtimeSync();

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
