import sys

def replace_file_content(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Step 1: Add cleanup and startAnimation helper
    search_1 = """  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animatingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Selection Overlay State ---"""

    replace_1 = """  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animatingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (animatingTimerRef.current) clearTimeout(animatingTimerRef.current);
    };
  }, []);

  const startAnimation = useCallback(() => {
    setIsAnimating(true);
    if (animatingTimerRef.current) clearTimeout(animatingTimerRef.current);
    animatingTimerRef.current = setTimeout(() => setIsAnimating(false), 600);
  }, []);

  // --- Selection Overlay State ---"""

    content = content.replace(search_1, replace_1)

    # Step 2: Update useDrag
    search_2 = """    if (first) {
      setIsDragging(true);
      if (title) {
        tts.speak(title, learningLanguage);
      }
      if (isExpanded) {
        x.set(targetCenterX.get());
        y.set(targetCenterY.get());
        updatePosition(cardData.uid, targetCenterX.get(), targetCenterY.get());
        setIsExpanded(false);
        onBlur?.();
      }
      onDragStart?.(cardData.uid);
    }"""

    replace_2 = """    if (first) {
      setIsDragging(true);
      if (title) {
        tts.speak(title, learningLanguage);
      }
      if (isExpanded) {
        startAnimation();
        x.set(targetCenterX.get());
        y.set(targetCenterY.get());
        updatePosition(cardData.uid, targetCenterX.get(), targetCenterY.get());
        setIsExpanded(false);
        onBlur?.();
      }
      onDragStart?.(cardData.uid);
    }"""

    content = content.replace(search_2, replace_2)

    # Step 3: Update isActive
    search_3 = "const isActive = isHovered || isDragging || isExpanded || isOver || isOverlayOpen;"
    replace_3 = "const isActive = (isHovered || isDragging || isExpanded || isOver || isOverlayOpen) && !isAnimating;"

    content = content.replace(search_3, replace_3)

    # Step 4: Update onClick
    search_4 = """        const nextState = !isExpanded;
        setIsExpanded(nextState);

        if (nextState) {"""

    replace_4 = """        const nextState = !isExpanded;
        setIsExpanded(nextState);
        startAnimation();

        if (nextState) {"""

    content = content.replace(search_4, replace_4)

    # Step 5: Update onContextMenu
    search_5 = """      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();

        setIsAnimating(true);
        if (animatingTimerRef.current) clearTimeout(animatingTimerRef.current);
        animatingTimerRef.current = setTimeout(() => setIsAnimating(false), 600);

        if (!isFlipped) {"""

    replace_5 = """      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();

        startAnimation();

        if (!isFlipped) {"""

    content = content.replace(search_5, replace_5)

    with open(file_path, 'w') as f:
        f.write(content)

replace_file_content('src/app/components/ui/Card.tsx')
