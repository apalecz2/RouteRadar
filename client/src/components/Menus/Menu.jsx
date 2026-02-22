import React, { useState, useEffect, useRef, createContext, useContext } from "react";

// Global menu state management
const MenuContext = createContext();

export const useMenuContext = () => {
    const context = useContext(MenuContext);
    if (!context) {
        throw new Error('useMenuContext must be used within a MenuProvider');
    }
    return context;
};

export const MenuProvider = ({ children }) => {
    const [openMenuId, setOpenMenuId] = useState(null);

    const openMenu = (menuId) => {
        setOpenMenuId(menuId);
    };

    const closeMenu = () => {
        setOpenMenuId(null);
    };

    const isMenuOpen = (menuId) => {
        return openMenuId === menuId;
    };

    return (
        <MenuContext.Provider value={{ openMenu, closeMenu, isMenuOpen, openMenuId }}>
            {children}
        </MenuContext.Provider>
    );
};

const MenuButton = React.forwardRef(({ onClick, isOpen, disabled, children, className, position = "top-left", order = 0, ...props }, ref) => {
    const getPositionClasses = () => {
        const baseClasses = "left-8 md:left-12";

        switch (position) {
            case "top-right":
                return `top-8 right-8 md:right-12 md:top-12`;
            case "top-left":
            default:
                // Calculate top position based on order
                if (order === 0) return `top-8 md:top-12 ${baseClasses}`;
                if (order === 1) return `top-22 md:top-26 ${baseClasses}`;
                if (order === 2) return `top-36 md:top-40 ${baseClasses}`;
                if (order === 3) return `top-50 md:top-54 ${baseClasses}`;
                if (order === 4) return `top-64 md:top-68 ${baseClasses}`;
                // Default fallback
                return `top-8 md:top-12 ${baseClasses}`;
        }
    };

    return (
        <button
            ref={ref}
            onClick={onClick}
            disabled={disabled}
            className={`
                fixed ${getPositionClasses()} z-70
                p-2 md:p-2
                rounded-2xl
                        bg-white
                border border-black/30 shadow-xl
                hover:bg-gray-100
                flex items-center justify-center
                h-12 w-12
                ${className || ''}
            `}
            {...props}
        >
            {typeof children === 'function' ? children({ isOpen }) : children}
        </button>
    );
});

const CloseButton = ({ onClick }) => (
    <button
        onClick={onClick}
        className={`
            absolute top-6 right-6 z-20
            p-2 md:p-2
            rounded-2xl
            bg-white
            border border-black/30 shadow-xl
            hover:bg-gray-100
            flex items-center justify-center
            h-12 w-12
        `}
        aria-label="Close Menu"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 -960 960 960"
            width="24px"
            fill="#000000"
            className={`
                transition-transform duration-500 ease-in-out
            `}
        >
            <path d="M480-424 284-228q-11 11-28 11t-28-11q-11-11-11-28t11-28l196-196-196-196q-11-11-11-28t11-28q11-11 28-11t28 11l196 196 196-196q11-11 28-11t28 11q11 11 11 28t-11 28L536-480l196 196q11 11 11 28t-11 28q-11 11-28 11t-28-11L480-424Z" />
        </svg>
    </button>
);

const MenuContent = ({ children, isOpen, animatingOut, menuOrigin, title, onClose }) => {
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
                fixed top-0 left-0 w-full h-full z-80
                flex justify-center md:justify-start items-start
                py-4 px-4 md:px-6 md:py-6
                pointer-events-none
            `}
        >
            <div
                className={`
                    relative
                    w-full md:w-[420px]
                    min-h-[calc(100vh-4rem)] p-4 md:p-6 overflow-y-auto z-90
                    rounded-2xl md:rounded-3xl
                    bg-white
                    border border-black/30 shadow-2xl
                    before:content-[''] before:absolute before:inset-0
                    before:rounded-2xl md:before:rounded-3xl
                    before:bg-gradient-to-br before:from-white/10 before:to-transparent
                    before:pointer-events-none
                    pointer-events-auto
                    menu-pop
                    ${(isOpen && !animatingOut && animateIn) ? 'menu-pop-in' : ''}
                    ${animatingOut ? 'menu-pop-out' : ''}
                `}
                style={{ transformOrigin: `${menuOrigin.x}px ${menuOrigin.y}px` }}
            >
                <CloseButton onClick={onClose} />
                {title && (
                    <div className="relative z-10 text-center h-12 p-2 mb-6">
                        <h2 className="text-black text-2xl font-semibold">{title}</h2>
                    </div>
                )}
                {children}
            </div>
        </div>
    );
};

const AbstractMenu = ({
    children,
    buttonContent,
    title,
    buttonClassName,
    buttonProps = {},
    onMenuToggle,
    isControlled = false,
    isOpen: controlledIsOpen,
    onOpenChange,
    menuId,
    position = "top-left",
    order = 0
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [menuShouldBeOpen, setMenuShouldBeOpen] = useState(false);
    const [animatingOut, setAnimatingOut] = useState(false);
    const [menuOrigin, setMenuOrigin] = useState({ x: 24, y: 24 });
    const buttonRef = useRef(null);

    const { openMenu, closeMenu, isMenuOpen, openMenuId } = useMenuContext();

    const isOpen = isControlled ? controlledIsOpen : menuOpen;
    const isThisMenuOpen = menuId ? isMenuOpen(menuId) : isOpen;

    // Effect to handle global menu state changes
    useEffect(() => {
        if (menuId && openMenuId && openMenuId !== menuId) {
            // Another menu is open, close this one
            if (showMenu) {
                setAnimatingOut(true);
                setMenuShouldBeOpen(false);
                setTimeout(() => {
                    setAnimatingOut(false);
                    setShowMenu(false);
                }, 500);
            }
        }
    }, [openMenuId, menuId, showMenu]);

    const openMenuHandler = () => {
        if (animatingOut) return;

        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuOrigin({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            });
        }
        const newOpenState = true;
        if (!isControlled) setMenuOpen(newOpenState);
        if (menuId) openMenu(menuId);
        setShowMenu(true);
        setMenuShouldBeOpen(true);
        onOpenChange?.(newOpenState);
        onMenuToggle?.(true);
    };

    const closeMenuHandler = () => {
        if (animatingOut) return;

        const newOpenState = false;
        if (!isControlled) setMenuOpen(newOpenState);
        if (menuId) closeMenu();
        setAnimatingOut(true);
        setMenuShouldBeOpen(false);
        onOpenChange?.(newOpenState);
        setTimeout(() => {
            setAnimatingOut(false);
            setShowMenu(false);
        }, 500);
        onMenuToggle?.(false);
    };

    return (
        <>
            <div className="relative z-70">
                <MenuButton
                    ref={buttonRef}
                    onClick={openMenuHandler}
                    isOpen={isThisMenuOpen}
                    disabled={animatingOut}
                    className={buttonClassName}
                    position={position}
                    order={order}
                    {...buttonProps}
                >
                    {buttonContent}
                </MenuButton>
            </div>
            {showMenu && (
                <MenuContent
                    isOpen={menuShouldBeOpen}
                    animatingOut={animatingOut}
                    menuOrigin={menuOrigin}
                    title={title}
                    onClose={closeMenuHandler}
                >
                    {children}
                </MenuContent>
            )}
        </>
    );
};

export default AbstractMenu; 