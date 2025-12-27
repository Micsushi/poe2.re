import vendorIcon from "@/img/whetstone_inventory_icon.png";
import waystoneIcon from "@/img/waystone_inventory_icon.png";
import tabletIcon from "@/img/precursortablet_inventory_icon.png";
import relicIcon from "@/img/relic_inventory_icon.png";


import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const items = [
  {
    title: "Vendor",
    url: "/vendor",
    icon: vendorIcon,
  },
  {
    title: "Waystones",
    url: "/waystone",
    icon: waystoneIcon,
  },
  {
    title: "Tablets",
    url: "/tablet",
    icon: tabletIcon,
  },
  {
    title: "Relics",
    url: "/relic",
    icon: relicIcon,
  },
]

export function Menu() {
  const pathname = window.location.pathname;
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarGroupLabel>Categories</SidebarGroupLabel>
          </SidebarMenu>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <a href={item.url}>
                      <img src={item.icon} alt={item.title} width="32" height="32"/>
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}