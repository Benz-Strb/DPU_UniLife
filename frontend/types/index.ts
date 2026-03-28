export interface User {
  id: string;
  email: string;
  name?: string;
}

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  Profile: undefined;
};
