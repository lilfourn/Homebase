import { UserCourseList, AddCourseForm } from "../components/dashboard";

export default function Dashboard() {
  return (
    <main className = "Dashboard">
      <AddCourseForm/>
      <UserCourseList/>
    </main>
  );
}
  