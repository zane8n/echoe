import { redirect } from "next/navigation";

// My Day now lives on Today, next to the paths it sits beside.
export default function MyDayPage() {
    redirect("/#tasks");
}
