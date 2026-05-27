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

/**
 * Resposta do POST /users/register.
 *
 * No fluxo "aluno inicia a conversa", o backend NÃO envia a mensagem
 * de boas-vindas — em vez disso devolve um link wa.me que o aluno
 * deve clicar pra ativar o cadastro enviando a primeira mensagem.
 *
 * - `whatsapp_link`: URL pré-formatada `https://wa.me/...?text=...`
 *   com o token de ativação embutido. NULL quando o cadastro já
 *   está ativo (aluno re-acessa o site após ter ativado).
 * - `registration_completed`: TRUE quando o aluno já enviou a 1ª
 *   mensagem; o frontend usa pra decidir entre mostrar o botão de
 *   ativação ou confirmar que o cadastro já está completo.
 */
export interface StudentRegisterOut extends StudentOut {
  whatsapp_link: string | null;
  registration_completed: boolean;
}

export interface StudentStatus {
  id: string;
  registration_completed: boolean;
}

export async function registerStudent(
  payload: StudentRegisterPayload,
): Promise<StudentRegisterOut> {
  const { data } = await api.post<StudentRegisterOut>(
    "/users/register",
    payload,
  );
  return data;
}

export async function getRegistrationStatus(
  studentId: string,
): Promise<StudentStatus> {
  const { data } = await api.get<StudentStatus>(
    `/users/${studentId}/status`,
  );
  return data;
}

export async function listStudents(): Promise<StudentOut[]> {
  const { data } = await api.get<StudentOut[]>("/users");
  return data;
}

export async function deleteStudent(phone: string): Promise<void> {
  await api.delete(`/users/${phone}`);
}
