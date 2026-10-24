"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function useAuthGuard(requiredRole: "policymaker" | "student") {
  const router = useRouter()
  const [userName, setUserName] = useState<string>("")
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const role = localStorage.getItem("user_role")
    const name = localStorage.getItem("user_name")

    if (!role || role !== requiredRole) {
      router.replace("/login")
    } else {
      setUserName(name || (requiredRole === "policymaker" ? "Demo Policymaker" : "Demo Student"))
      setAuthorized(true)
    }
  }, [requiredRole, router])

  const logout = () => {
    localStorage.removeItem("user_role")
    localStorage.removeItem("user_name")
    router.replace("/login")
  }

  return { authorized, userName, logout }
}
