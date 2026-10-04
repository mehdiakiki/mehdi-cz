"use client";

import { Dialog, Transition } from "@headlessui/react";
import { clearAllBodyScrollLocks, disableBodyScroll, enableBodyScroll } from "body-scroll-lock";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef } from "react";
import headerNavLinks from "@/data/headerNavLinks";
import IntentLink from "./IntentLink";

type MobileNavPanelProps = {
  open: boolean;
  onClose: () => void;
};

const MobileNavPanel = ({ open, onClose }: MobileNavPanelProps) => {
  const navRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const target = navRef.current;

    if (!target) return;

    if (open) {
      disableBodyScroll(target);
    } else {
      enableBodyScroll(target);
    }

    return () => enableBodyScroll(target);
  }, [open]);

  useEffect(() => clearAllBodyScrollLocks, []);

  return (
    <Transition appear show={open} as={Fragment} unmount={false}>
      <Dialog as="div" onClose={onClose} unmount={false}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          unmount={false}
        >
          <div className="fixed inset-0 z-60 bg-black/25" />
        </Transition.Child>

        <Transition.Child
          as={Fragment}
          enter="transition ease-in-out duration-300 transform"
          enterFrom="translate-x-full opacity-0"
          enterTo="translate-x-0 opacity-95"
          leave="transition ease-in duration-200 transform"
          leaveFrom="translate-x-0 opacity-95"
          leaveTo="translate-x-full opacity-0"
          unmount={false}
        >
          <Dialog.Panel className="fixed top-0 left-0 z-70 h-full w-full bg-white opacity-95 duration-300 dark:bg-gray-950 dark:opacity-[0.98]">
            <nav
              ref={navRef}
              className="mt-8 flex h-full basis-0 flex-col items-start overflow-y-auto pt-2 pl-12 text-left"
            >
              {headerNavLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

                return (
                  <IntentLink
                    key={link.title}
                    href={link.href}
                    className={`hover:text-primary-700 dark:hover:text-primary-300 mb-4 py-2 pr-4 text-2xl font-bold tracking-widest outline outline-0 ${
                      isActive
                        ? "border-primary-500 text-primary-700 dark:border-primary-400 dark:text-primary-400 border-l-4 pl-8"
                        : "text-gray-900 dark:text-gray-100"
                    }`}
                    onClick={onClose}
                  >
                    {link.title}
                  </IntentLink>
                );
              })}
            </nav>

            <button
              className="hover:text-primary-700 dark:hover:text-primary-300 fixed top-7 right-4 z-80 h-16 w-16 p-4 text-gray-900 dark:text-gray-100"
              aria-label="Close menu"
              onClick={onClose}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </Dialog.Panel>
        </Transition.Child>
      </Dialog>
    </Transition>
  );
};

export default MobileNavPanel;
