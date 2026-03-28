import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: "/conversations",
    permanent: false,
  },
});

export default function InboxCompatibilityRedirect() {
  return null;
}
