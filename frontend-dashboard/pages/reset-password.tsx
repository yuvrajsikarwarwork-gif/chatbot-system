import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: "/forgot-password",
    permanent: false,
  },
});

export default function ResetPasswordCompatibilityRedirect() {
  return null;
}
