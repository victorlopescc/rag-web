import { api } from "./client";

export interface StudentRegisterPayload {
  full_name: string;
  matricula: string;
  phone_number: string;
  data_consent: boolean;
}

export interface StudentOut {
  id: string;
  full_name: string;
  matricula: string;
  phone_number: string;
  lid: string | null;
  active: boolean;
  data_consent: boolean;
}

export async function registerStudent(
  payload: StudentRegisterPayload,
): Promise<StudentOut> {
  const { data } = await api.post<StudentOut>("/users/register", payload);
  return data;
}

export async function listStudents(): Promise<StudentOut[]> {
  const { data } = await api.get<StudentOut[]>("/users");
  return data;
}

export async function deleteStudent(phone: string): Promise<void> {
  await api.delete(`/users/${phone}`);
}
