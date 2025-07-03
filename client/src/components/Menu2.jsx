import React, { useState, useMemo, useEffect, useRef } from "react";
import { useData } from './Providers/DataProvider';

const RouteSelection = ({ routeIds, setRouteIds, isOpen, animatingOut, menuOrigin }) => {
    const { routes, loading, error } = useData();
    const allRoutes = useMemo(() => {
        if (!routes) return [];
        return [...new Set(routes.map(route => route.id))];
    }, [routes]);

    const handleToggleRoute = (route) => {
        setRouteIds(prev =>
            prev.includes(route)
                ? prev.filter(r => r !== route)
                : [...prev, route]
        );
    };

    // Animation state for smooth grow-in
    const [animateIn, setAnimateIn] = useState(false);
    useEffect(() => {
        let raf;
        if (isOpen && !animatingOut) {
            setAnimateIn(false);
            raf = requestAnimationFrame(() => setAnimateIn(true));
        } else {
            setAnimateIn(false);
        }
        return () => {
            if (raf) cancelAnimationFrame(raf);
            setAnimateIn(false);
        };
    }, [isOpen, animatingOut]);

    if (!isOpen && !animatingOut) return null;

    return (
        <div
            className={`
                fixed top-0 left-0 w-full h-full z-40
                flex justify-center md:justify-start items-start
                py-4 px-4 md:px-6 md:py-6
                pointer-events-none
            `}
        >
            <div
                className={`
                    relative
                    w-full  md:w-[420px]
                    min-h-[calc(100vh-4rem)] p-3 pt-2 overflow-y-auto z-50
                    rounded-2xl md:rounded-3xl
                    bg-white/10 dark:bg-white/5
                    backdrop-blur-2xl
                    border border-white/30 dark:border-white/15
                    shadow-2xl
                    before:content-[''] before:absolute before:inset-0
                    before:rounded-2xl md:before:rounded-3xl
                    before:bg-gradient-to-br before:from-white/40 before:to-white/0
                    before:pointer-events-none
                    pointer-events-auto
                    menu-pop
                    ${(isOpen && !animatingOut && animateIn) ? 'menu-pop-in' : ''}
                    ${animatingOut ? 'menu-pop-out' : ''}
                `}
                style={{transformOrigin: `${menuOrigin.x}px ${menuOrigin.y}px`}}
            >
                <div className="relative z-10 text-center">
                    <h2 className="text-black text-xl font-semibold mb-4">Menu</h2>
                </div>
                <div>
                    <h3 className="font-medium mb-1">Select Routes</h3>
                    <ul className="space-y-1 max-h-[calc(100vh-16rem)] overflow-y-auto">
                        {allRoutes.map(route => {
                            const isSelected = routeIds.includes(route);
                            return (
                                <li key={route}>
                                    <label
                                        className="flex items-center space-x-2 px-2 py-1 rounded cursor-pointer"
                                        style={{ color: isSelected ? 'white' : 'black' }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleRoute(route)}
                                        />
                                        <span>Route {route}</span>
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const MenuButton = React.forwardRef(({ onClick, isOpen, disabled }, ref) => (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className={`
        fixed top-8 left-8 md:left-12 md:top-12 z-50
        p-2 md:p-2
        rounded-2xl
        bg-white/10 dark:bg-white/5
        backdrop-blur-2xl
        ${isOpen ? '' : 'border border-black/30 dark:border-black/30 shadow-xl'}
        hover:bg-white/50
        flex items-center justify-center
        h-12 w-12
      `}
      aria-label="Toggle Menu"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height="24px"
        viewBox="0 -960 960 960"
        width="24px"
        fill="#000000"
        className={`
          transition-transform duration-500 ease-in-out
          ${isOpen ? 'rotate-180' : 'rotate-0'}
        `}
      >
        <path d={isOpen
          ? "M480-424 284-228q-11 11-28 11t-28-11q-11-11-11-28t11-28l196-196-196-196q-11-11-11-28t11-28q11-11 28-11t28 11l196 196 196-196q11-11 28-11t28 11q11 11 11 28t-11 28L536-480l196 196q11 11 11 28t-11 28q-11 11-28 11t-28-11L480-424Z"
          : "M160-240q-17 0-28.5-11.5T120-280q0-17 11.5-28.5T160-320h640q17 0 \
  28.5 11.5T840-280q0 17-11.5 28.5T800-240H160Zm0-200q-17 \
  0-28.5-11.5T120-480q0-17 11.5-28.5T160-520h640q17 0 \
  28.5 11.5T840-480q0 17-11.5 28.5T800-440H160Zm0-200q-17 \
  0-28.5-11.5T120-680q0-17 11.5-28.5T160-720h640q17 0 \
  28.5 11.5T840-680q0 17-11.5 28.5T800-640H160Z"
        }
        />
      </svg>
    </button>
  ));

const Menu2 = ({ routeIds, setRouteIds }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [menuShouldBeOpen, setMenuShouldBeOpen] = useState(false);
    const [animatingOut, setAnimatingOut] = useState(false);
    const [menuOrigin, setMenuOrigin] = useState({ x: 24, y: 24 });
    const buttonRef = useRef(null);

    const toggleMenu = () => {
        if (animatingOut) return;
        if (menuOpen) {
            setMenuOpen(false);
            setAnimatingOut(true);
            setMenuShouldBeOpen(false);
            setTimeout(() => {
                setAnimatingOut(false);
                setShowMenu(false);
            }, 500);
        } else {
            if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                setMenuOrigin({
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                });
            }
            setMenuOpen(true);
            setShowMenu(true);
            setMenuShouldBeOpen(true);
        }
    };

    return (
        <>
            <div className="relative z-50">
                <MenuButton ref={buttonRef} onClick={toggleMenu} isOpen={menuOpen} disabled={animatingOut} />
            </div>
            {showMenu && (
                <RouteSelection
                    routeIds={routeIds}
                    setRouteIds={setRouteIds}
                    isOpen={menuShouldBeOpen}
                    animatingOut={animatingOut}
                    menuOrigin={menuOrigin}
                />
            )}
        </>
    );
};

export default Menu2;
