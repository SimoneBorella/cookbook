"use client"

import { ChefHat, BookOpen } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain() {
  const t = useTranslations("Sidebar"); 

  const items = [
    {
      title: t("dashboard") || "La Mia Cucina",
      url: "/dashboard",
      icon: ChefHat,
    },
    {
      title: t("recipes") || "Tutte le Ricette",
      url: "/recipes",
      icon: BookOpen,
    }
  ];

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild>
                <Link href={item.url as any}> 
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}