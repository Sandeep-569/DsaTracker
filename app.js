// App State & Secure In-Memory Management
let companyList = [];
let maxTotal = 1;
let currentCompanyObj = null;
let currentTopicName = null;
let currentTopicFilter = 'All';

// In-Memory Progress Sets (populates only after authenticated)
let solvedProblems = new Set();
let starredProblems = new Set();
let solvedDates = new Map(); // title → ISO date string of when it was solved
let reviewProblems = []; // Array of { id, name, pattern, notes, solvedDate, stage, nextReview, history }
let totalUniqueCount = 0;

// True once Firestore has delivered authoritative data for this session.
// Prevents initData()'s localStorage seed-merge from overwriting/polluting
// cloud data if the cloud snapshot arrives before data.js finishes loading.
let cloudAuthoritativeDataLoaded = false;

// ============================================================
// TOPIC CLASSIFICATION ENGINE — 31 Topics, Basic → Advanced
// Uses URL slug matching (most accurate) + keyword fallbacks
// ============================================================

const TOPIC_RULES = [
  {
    name: 'Math & Geometry', icon: '🧮', order: 1,
    slugs: ['add-two-integers','palindrome-number','roman-to-integer','integer-to-roman','plus-one','add-binary','add-strings','add-digits','happy-number','fizz-buzz','count-primes','power-of-two','power-of-three','power-of-four','excel-sheet-column-number','excel-sheet-column-title','factorial-trailing-zeroes','sqrtx','powx-n','reverse-integer','integer-break','ugly-number','ugly-number-ii','super-ugly-number','perfect-number','nth-digit','self-dividing-numbers','water-bottles','nim-game','bulb-switcher','maximum-swap','gcd-of-strings','greatest-common-divisor-of-strings','count-partitions-with-even-sum-difference','smallest-divisible-digit-product-i','smallest-divisible-digit-product-ii','maximum-number-of-balls-in-a-box','maximum-area-of-longest-diagonal-rectangle','preimage-size-of-factorial-zeroes-function','consecutive-numbers-sum','multiply-strings','rotate-function','find-polygon-with-the-largest-perimeter','sum-of-all-subset-xor-totals','smallest-range-i','smallest-range-ii','ant-on-the-boundary','find-the-child-who-has-the-ball-after-k-seconds','count-tested-devices-after-test-operations','permutation-difference-between-two-strings','find-the-winner-of-the-circular-game','check-divisibility-by-digit-sum-and-product'],
    keywords: ['math','prime','gcd','roman','sqrt','pow','factorial','geometry','rectangle','area','circle','angle','polygon','divisor','divisible','modulo']
  },
  {
    name: 'Array', icon: '📦', order: 3,
    slugs: ['two-sum','contains-duplicate','contains-duplicate-ii','move-zeroes','remove-element','remove-duplicates-from-sorted-array','remove-duplicates-from-sorted-array-ii','merge-sorted-array','majority-element','rotate-array','rotate-image','spiral-matrix','spiral-matrix-ii','product-of-array-except-self','find-the-difference-of-two-arrays','intersection-of-two-arrays','intersection-of-two-arrays-ii','set-matrix-zeroes','game-of-life','next-permutation','max-consecutive-ones','max-consecutive-ones-iii','pascal s-triangle','pascals-triangle','contiguous-array','maximum-subarray','maximum-product-subarray','find-pivot-index','find-the-peaks','find-subsequence-of-length-k-with-the-largest-sum','sort-array-by-increasing-frequency','number-of-good-pairs','find-the-number-of-good-pairs-i','find-the-number-of-good-pairs-ii','rank-transform-of-an-array','split-the-array','check-if-array-pairs-are-divisible-by-k','minimum-right-shifts-to-sort-the-array','final-value-of-variable-after-performing-operations','count-subarrays-where-max-element-appears-at-least-k-times','number-of-subarrays-with-bounded-maximum','minimum-number-of-operations-to-have-distinct-elements','minimizing-array-after-replacing-pairs-with-their-product','minimum-array-changes-to-make-differences-equal','increment-submatrices-by-one','plates-between-candles','separate-black-and-white-balls','n-repeated-element-in-size-2n-array','flatten-2d-vector'],
    keywords: ['array','subarrays','matrix','grid','rotate','zeroes','indices','intervals','duplicate','moves','pairs','contiguous','subarray']
  },
  {
    name: 'Sorting Algorithms', icon: '🔃', order: 4,
    slugs: ['sort-an-array','sort-colors','largest-number','merge-intervals','meeting-rooms-ii','insert-interval','non-overlapping-intervals','minimum-number-of-arrows-to-burst-balloons','sort-characters-by-frequency','sort-list','wiggle-sort','wiggle-sort-ii','h-index','valid-triangle-number','queue-reconstruction-by-height','relative-sort-array','custom-sort-string','pancake-sorting','orderly-queue','car-fleet','car-pooling','divide-intervals-into-minimum-number-of-groups','maximum-team-size-with-overlapping-intervals','eliminate-maximum-number-of-monsters','minimum-absolute-difference','reformat-phone-number'],
    keywords: ['sort-an-array','sort-colors','merge-intervals','meeting-rooms','insert-interval']
  },
  {
    name: 'Prefix Sum', icon: '➕', order: 5,
    slugs: ['range-sum-query-immutable','range-sum-query-2d-immutable','subarray-sum-equals-k','contiguous-array','find-pivot-index','product-of-array-except-self','count-number-of-nice-subarrays','binary-subarrays-with-sum','maximum-size-subarray-sum-equals-k','continuous-subarray-sum','random-pick-with-weight','xor-queries-of-a-subarray'],
    keywords: ['prefix-sum','range-sum','subarray-sum']
  },
  {
    name: 'String', icon: '🔤', order: 6,
    slugs: ['reverse-string','reverse-string-ii','reverse-vowels-of-a-string','reverse-words-in-a-string','valid-palindrome','valid-anagram','first-unique-character-in-a-string','longest-common-prefix','longest-palindrome','longest-palindromic-substring','longest-palindromic-subsequence','is-subsequence','string-compression','string-to-integer-atoi','find-all-anagrams-in-a-string','group-anagrams','rotate-string','reformat-date','validate-ip-address','count-pairs-of-similar-strings','shortest-palindrome','minimum-insertion-steps-to-make-a-string-palindrome','shortest-uncommon-substring-in-an-array','backspace-string-compare','palindromic-substrings','longest-repeating-character-replacement','strings-differ-by-one-character','lexicographically-smallest-string-after-substring-operation','regular-expression-matching','text-justification','replace-the-substring-for-balanced-string','decode-string','largest-odd-number-in-string','find-the-difference','permutation-difference-between-two-strings','reorganize-string','remove-all-adjacent-duplicates-in-string-ii','minimum-number-of-swaps-to-make-the-string-balanced','special-binary-string','to-be-or-not-to-be','check-if-digits-are-equal-in-string-after-operations-ii'],
    keywords: ['string','substring','word','character','palindrome','vowels','anagram','letters','atoi','text']
  },
  {
    name: 'Hash Table', icon: '🔑', order: 7,
    slugs: ['two-sum','contains-duplicate','contains-duplicate-ii','contains-duplicate-iii','group-anagrams','valid-anagram','first-unique-character-in-a-string','intersection-of-two-arrays','longest-consecutive-sequence','top-k-frequent-elements','top-k-frequent-words','subarray-sum-equals-k','longest-substring-without-repeating-characters','number-of-good-pairs','find-the-difference-of-two-arrays','count-pairs-of-similar-strings'],
    keywords: ['hash','two-sum','contains-duplicate','group-anagrams','frequency','lru-cache']
  },
  {
    name: 'Two Pointers', icon: '⚖️', order: 8,
    slugs: ['two-sum-ii-input-array-is-sorted','3sum','4sum','container-with-most-water','trapping-rain-water','move-zeroes','sort-colors','remove-duplicates-from-sorted-array','remove-duplicates-from-sorted-array-ii','remove-element','squares-of-a-sorted-array','valid-palindrome','merge-sorted-array','backspace-string-compare','is-subsequence','merge-operations-to-turn-array-into-a-palindrome','subarray-product-less-than-k'],
    keywords: ['two-pointer','container-with-most-water','trapping-rain-water']
  },
  {
    name: 'Sliding Window', icon: '🪟', order: 9,
    slugs: ['longest-substring-without-repeating-characters','minimum-window-substring','minimum-window-subsequence','sliding-window-maximum','find-all-anagrams-in-a-string','permutation-in-string','longest-repeating-character-replacement','fruit-into-baskets','max-consecutive-ones-iii','minimum-swaps-to-group-all-1s-together-ii','count-subarrays-where-max-element-appears-at-least-k-times','minimum-number-of-days-to-make-m-bouquets','subarray-product-less-than-k','number-of-subarrays-with-bounded-maximum','maximum-width-ramp'],
    keywords: ['sliding-window','min-window','longest-substring-without']
  },
  {
    name: 'Binary Search', icon: '🔍', order: 10,
    slugs: ['binary-search','search-insert-position','search-a-2d-matrix','search-in-rotated-sorted-array','search-in-rotated-sorted-array-ii','find-first-and-last-position-of-element-in-sorted-array','find-peak-element','peak-index-in-a-mountain-array','koko-eating-bananas','capacity-to-ship-packages-within-d-days','find-the-smallest-divisor-given-a-threshold','single-element-in-a-sorted-array','median-of-two-sorted-arrays','heaters','random-pick-with-weight','convert-sorted-array-to-binary-search-tree','minimum-number-of-days-to-make-m-bouquets','maximum-profit-in-job-scheduling'],
    keywords: ['binary-search','search-insert','rotated-sorted','peak','find-first-and-last','median-of-two','koko']
  },
  {
    name: 'Linked List', icon: '🔗', order: 11,
    slugs: ['reverse-linked-list','reverse-nodes-in-k-group','linked-list-cycle','linked-list-cycle-ii','middle-of-the-linked-list','merge-two-sorted-lists','merge-k-sorted-lists','add-two-numbers','remove-nth-node-from-end-of-list','remove-duplicates-from-sorted-list','intersection-of-two-linked-lists','sort-list','palindrome-linked-list','delete-node-in-a-linked-list','odd-even-linked-list','reorder-list','swap-nodes-in-pairs','rotate-list','copy-list-with-random-pointer','flatten-a-multilevel-doubly-linked-list'],
    keywords: ['linked-list','reverse-linked','middle-of-the-linked','merge-two-sorted-lists','add-two-numbers','remove-nth-node']
  },
  {
    name: 'Stack & Queue', icon: '🥞', order: 12,
    slugs: ['valid-parentheses','min-stack','decode-string','basic-calculator','basic-calculator-ii','evaluate-reverse-polish-notation','simplify-path','remove-k-digits','asteroid-collision','remove-all-adjacent-duplicates-in-string-ii','longest-valid-parentheses','generate-parentheses','reverse-substrings-between-each-pair-of-parentheses','flatten-nested-list-iterator','mini-parser','number-of-atoms','parse-lisp-expression','implement-queue-using-stacks','implement-stack-using-queues','design-circular-queue','design-circular-deque'],
    keywords: ['stack','queue','parentheses','calculator','eval','reverse-polish']
  },
  {
    name: 'Monotonic Stack / Queue', icon: '📊', order: 13,
    slugs: ['daily-temperatures','next-greater-element-i','next-greater-element-ii','next-greater-element-iii','largest-rectangle-in-histogram','maximal-rectangle','sum-of-subarray-minimums','sum-of-subarray-ranges','online-stock-span','sliding-window-maximum','trapping-rain-water','maximum-width-ramp','car-fleet','132-pattern','shortest-unsorted-continuous-subarray'],
    keywords: ['daily-temperatures','next-greater','histogram','monotonic','stock-span']
  },
  {
    name: 'Heap / Priority Queue', icon: '⛰️', order: 14,
    slugs: ['kth-largest-element-in-an-array','kth-largest-element-in-a-stream','top-k-frequent-elements','top-k-frequent-words','merge-k-sorted-lists','find-median-from-data-stream','meeting-rooms-ii','task-scheduler','reorganize-string','sort-characters-by-frequency','last-stone-weight','k-closest-points-to-origin','ugly-number-ii','super-ugly-number','ipo','employee-free-time','sliding-window-median','the-skyline-problem'],
    keywords: ['kth-largest','top-k','merge-k-sorted','priority-queue','heap','median-from-data-stream']
  },
  {
    name: 'Recursion', icon: '🔄', order: 15,
    slugs: ['fibonacci-number','n-th-tribonacci-number','climbing-stairs','powx-n','swap-nodes-in-pairs','letter-combinations-of-a-phone-number','count-complete-tree-nodes','nested-list-weight-sum','flatten-nested-list-iterator'],
    keywords: ['fibonacci','tribonacci','recursion']
  },
  {
    name: 'Backtracking', icon: '🔀', order: 16,
    slugs: ['subsets','subsets-ii','permutations','permutations-ii','combination-sum','combination-sum-ii','combination-sum-iii','combinations','letter-combinations-of-a-phone-number','generate-parentheses','palindrome-partitioning','n-queens','n-queens-ii','sudoku-solver','word-search','word-search-ii','restore-ip-addresses','target-sum','count-all-valid-pickup-and-delivery-options','shopping-offers','pyramid-transition-matrix'],
    keywords: ['n-queens','sudoku','subsets','permutations','combination-sum','word-search','restore-ip','backtrack']
  },
  {
    name: 'Tree & Binary Tree', icon: '🌳', order: 17,
    slugs: ['maximum-depth-of-binary-tree','minimum-depth-of-binary-tree','same-tree','symmetric-tree','invert-binary-tree','binary-tree-level-order-traversal','binary-tree-zigzag-level-order-traversal','binary-tree-right-side-view','binary-tree-maximum-path-sum','binary-tree-cameras','construct-binary-tree-from-preorder-and-inorder-traversal','validate-binary-search-tree','convert-sorted-array-to-binary-search-tree','binary-search-tree-iterator','lowest-common-ancestor-of-a-binary-tree','lowest-common-ancestor-of-a-binary-search-tree','path-sum','path-sum-ii','path-sum-iii','count-complete-tree-nodes','count-univalue-subtrees','subtree-of-another-tree','trim-a-binary-search-tree','serialize-and-deserialize-binary-tree','flatten-binary-tree-to-linked-list','amount-of-time-for-binary-tree-to-be-infected','boundary-of-binary-tree','cousins-in-binary-tree','populating-next-right-pointers-in-each-node','diameter-of-binary-tree','balanced-binary-tree','kth-smallest-element-in-a-bst','delete-node-in-a-bst','longest-increasing-path-in-a-matrix','number-of-increasing-paths-in-a-grid','find-diameter-endpoints-of-a-tree','count-ways-to-build-rooms-in-an-ant-colony','maximum-number-of-moves-in-a-grid','special-binary-string'],
    keywords: ['tree','bst','inorder','preorder','postorder','subtree','binary-tree','leaf','root','depth','ancestor']
  },
  {
    name: 'Trie', icon: '🌲', order: 18,
    slugs: ['implement-trie-prefix-tree','design-add-and-search-words-data-structure','word-search-ii','search-suggestions-system','palindrome-pairs','longest-word-in-dictionary','replace-words','map-sum-pairs','maximum-xor-of-two-numbers-in-an-array'],
    keywords: ['trie','prefix-tree','search-suggestions']
  },
  {
    name: 'Segment Tree / BIT', icon: '🏗️', order: 19,
    slugs: ['range-sum-query-mutable','count-of-smaller-numbers-after-self','reverse-pairs','the-skyline-problem','my-calendar-i','my-calendar-ii','my-calendar-iii','count-of-range-sum','threshold-majority-queries'],
    keywords: ['segment-tree','binary-indexed-tree','range-sum-query-mutable','fenwick']
  },
  {
    name: 'Graph & DFS/BFS', icon: '🕸️', order: 20,
    slugs: ['number-of-islands','number-of-provinces','max-area-of-island','flood-fill','rotting-oranges','01-matrix','surrounded-regions','pacific-atlantic-water-flow','course-schedule','course-schedule-ii','clone-graph','word-ladder','making-a-large-island','shortest-path-in-binary-matrix','shortest-path-in-a-grid-with-obstacles-elimination','shortest-path-to-get-all-keys','minimum-jumps-to-reach-home','detonate-the-maximum-bombs','minimum-number-of-vertices-to-reach-all-nodes','sliding-puzzle','minimum-number-of-flips-to-convert-binary-matrix-to-zero-matrix','divide-nodes-into-the-maximum-number-of-groups','reconstruct-itinerary','unit-conversion-i'],
    keywords: ['islands','flood-fill','rotting-oranges','course-schedule','provinces','surrounded-regions','pacific-atlantic','clone-graph']
  },
  {
    name: 'Topological Sort', icon: '📐', order: 21,
    slugs: ['course-schedule','course-schedule-ii','alien-dictionary','parallel-courses-iii','sequence-reconstruction','minimum-height-trees','longest-increasing-path-in-a-matrix','sort-items-by-groups-respecting-dependencies'],
    keywords: ['topological','alien-dictionary','course-schedule']
  },
  {
    name: 'Union Find', icon: '🔗', order: 22,
    slugs: ['number-of-provinces','accounts-merge','redundant-connection','redundant-connection-ii','most-stones-removed-with-same-row-or-column','number-of-connected-components-in-an-undirected-graph','making-a-large-island','smallest-common-region','number-of-operations-to-make-network-connected'],
    keywords: ['union-find','disjoint-set','accounts-merge','redundant-connection']
  },
  {
    name: 'Shortest Path', icon: '🛤️', order: 23,
    slugs: ['cheapest-flights-within-k-stops','network-delay-time','path-with-minimum-effort','swim-in-rising-water','minimum-cost-to-reach-destination-in-time','shortest-path-in-binary-matrix','shortest-path-in-a-grid-with-obstacles-elimination','shortest-path-to-get-all-keys','word-ladder','find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance'],
    keywords: ['dijkstra','bellman-ford','shortest-path','cheapest-flights','network-delay']
  },
  {
    name: 'Minimum Spanning Tree', icon: '🌉', order: 24,
    slugs: ['min-cost-to-connect-all-points','connecting-cities-with-minimum-cost','optimize-water-distribution-in-a-village'],
    keywords: ['kruskal','prim','minimum-spanning','min-cost-to-connect']
  },
  {
    name: 'Greedy', icon: '⚡', order: 25,
    slugs: ['best-time-to-buy-and-sell-stock','best-time-to-buy-and-sell-stock-ii','jump-game','jump-game-ii','gas-station','candy','assign-cookies','lemonade-change','task-scheduler','can-place-flowers','partition-labels','minimum-number-of-arrows-to-burst-balloons','non-overlapping-intervals','queue-reconstruction-by-height','ipo','minimum-number-of-taps-to-open-to-water-a-garden','maximum-subarray','filling-bookcase-shelves','delete-and-earn','minimum-cost-for-tickets'],
    keywords: ['greedy','gas-station','jump-game','candy','assign-cookies','lemonade','task-scheduler','can-place-flowers']
  },
  {
    name: 'Dynamic Programming', icon: '🧠', order: 26,
    slugs: ['climbing-stairs','house-robber','house-robber-ii','coin-change','coin-change-2','longest-increasing-subsequence','longest-common-subsequence','edit-distance','word-break','word-break-ii','unique-paths','unique-paths-ii','minimum-path-sum','maximum-subarray','maximum-product-subarray','decode-ways','perfect-squares','partition-equal-subset-sum','target-sum','triangle','best-time-to-buy-and-sell-stock','best-time-to-buy-and-sell-stock-ii','best-time-to-buy-and-sell-stock-iii','best-time-to-buy-and-sell-stock-iv','best-time-to-buy-and-sell-stock-with-cooldown','maximal-square','longest-palindromic-substring','longest-palindromic-subsequence','palindrome-partitioning-ii','regular-expression-matching','wildcard-matching','interleaving-string','distinct-subsequences','minimum-insertion-steps-to-make-a-string-palindrome','minimum-cost-for-tickets','delete-and-earn','arithmetic-slices','maximum-profit-from-trading-stocks','maximum-number-of-moves-in-a-grid','number-of-increasing-paths-in-a-grid','filling-bookcase-shelves','choose-numbers-from-two-arrays-in-range','maximum-profit-in-job-scheduling','number-of-ways-to-build-house-of-cards','longest-string-chain','optimal-account-balancing','count-all-valid-pickup-and-delivery-options','integer-break','minimum-operations-to-reduce-an-integer-to-0'],
    keywords: ['climbing-stairs','house-robber','coin-change','longest-increasing-subsequence','longest-common-subsequence','edit-distance','word-break','unique-paths','knapsack','decode-ways','perfect-squares','maximal-square']
  },
  {
    name: 'Bit Manipulation', icon: '🔢', order: 27,
    slugs: ['single-number','single-number-ii','single-number-iii','number-of-1-bits','counting-bits','reverse-bits','missing-number','power-of-two','bitwise-and-of-numbers-range','sum-of-two-integers','find-the-difference','complement-of-base-10-integer','bitwise-or-of-adjacent-elements','largest-combination-with-bitwise-and-greater-than-zero','minimize-xor','xor-queries-of-a-subarray','sum-of-values-at-indices-with-k-set-bits','maximum-xor-of-two-numbers-in-an-array'],
    keywords: ['bit','bitwise','xor','single-number','counting-bits','reverse-bits','number-of-1-bits']
  },
  {
    name: 'Design Problems', icon: '🏛️', order: 28,
    slugs: ['lru-cache','lfu-cache','min-stack','insert-delete-getrandom-o1','insert-delete-getrandom-o1-duplicates-allowed','design-twitter','design-hit-counter','design-tic-tac-toe','design-file-system','design-excel-sum-formula','design-circular-queue','design-circular-deque','all-oone-data-structure','simple-bank-system','time-based-key-value-store','flatten-nested-list-iterator','flatten-2d-vector','binary-search-tree-iterator','implement-trie-prefix-tree','serialize-and-deserialize-binary-tree','find-median-from-data-stream'],
    keywords: ['lru-cache','lfu-cache','design-','insert-delete-getrandom','all-oone']
  },
  {
    name: 'Simulation', icon: '🎮', order: 29,
    slugs: ['game-of-life','spiral-matrix','spiral-matrix-ii','rotate-image','robot-bounded-in-circle','pour-water','fizz-buzz','number-of-divisible-triplet-sums','find-the-student-that-will-replace-the-chalk','minimum-processing-time','ip-to-cidr','convert-to-base-2','tenth-line'],
    keywords: ['simulation','game-of-life','robot-bounded','pour-water']
  },
  {
    name: 'SQL & Database', icon: '🗄️', order: 30,
    slugs: ['combine-two-tables','second-highest-salary','nth-highest-salary','rank-scores','consecutive-numbers','employees-earning-more-than-their-managers','department-top-three-salaries','rising-temperature','customer-who-visited-but-did-not-make-any-transactions','find-customer-referee','article-views-i','average-time-of-process-per-machine','invalid-tweets','fill-missing-data'],
    keywords: ['salary','employees-earning','department-top','rising-temperature','customer-who-visited','find-customer-referee','article-views','average-time-of-process','invalid-tweets','fill-missing']
  },
  {
    name: 'General DSA', icon: '📝', order: 31,
    slugs: [],
    keywords: []
  }
];

function getTopicOrder(topicName) {
  if (topicName === 'All Questions') return 0;
  if (topicName === '⭐ Bookmarked Questions') return 0.5;
  if (topicName === '✅ Solved Questions') return 0.6;
  const found = TOPIC_RULES.find(r => r.name === topicName);
  return found ? found.order : 99;
}

// Extract the URL slug from a LeetCode URL
function getSlugFromUrl(url) {
  if (!url) return '';
  const match = url.match(/leetcode\.com\/problems\/([^\/\?#]+)/);
  return match ? match[1].toLowerCase() : '';
}

// Get LeetCode problem number from URL slug using the pre-generated mapping
function getLeetCodeNumber(url) {
  if (typeof LEETCODE_NUM_MAP === 'undefined') return null;
  const slug = getSlugFromUrl(url);
  return slug ? (LEETCODE_NUM_MAP[slug] || null) : null;
}

// Parse a search query to detect LeetCode number searches
// Supports: "1", "#1", "#42", "42", etc.
function parseLeetCodeNumberQuery(query) {
  const trimmed = query.trim();
  const match = trimmed.match(/^#?(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

function getTopicsForProblem(problem) {
  const slug = getSlugFromUrl(problem.url);
  const lowerTitle = problem.title.toLowerCase();
  const combined = `${lowerTitle} ${slug}`;

  const matched = [];

  // Pass 1: Exact slug match (most accurate)
  TOPIC_RULES.forEach(rule => {
    if (rule.name === 'General DSA') return;
    if (rule.slugs && rule.slugs.includes(slug)) {
      matched.push(rule.name);
    }
  });

  // Pass 2: Keyword fallback (for problems not in any slug list)
  if (matched.length === 0) {
    TOPIC_RULES.forEach(rule => {
      if (rule.name === 'General DSA') return;
      if (rule.keywords && rule.keywords.some(k => combined.includes(k))) {
        matched.push(rule.name);
      }
    });
  }

  // Fallback: General DSA
  if (matched.length === 0) {
    matched.push('General DSA');
  }
  return matched;
}

function getTopicIcon(topicName) {
  const found = TOPIC_RULES.find(r => r.name === topicName);
  return found ? found.icon : '📝';
}

const knownAcronyms = new Set(['AI', 'DB', 'DP', 'UI', 'IT', 'QA', 'ML', 'FE', 'BE', 'HR', 'US', 'UK', 'ADP', 'BCG', 'DSI', 'DHI', 'GE', 'GS', 'EPAM', 'DE', 'AQR', 'CME', 'C3', 'IIT', 'MAQ', 'BNY', 'DJA', 'ZS', 'TCS']);

function normalizeCompanyNameKey(name) {
  return name.toLowerCase()
    .replace(/\b(inc|llc|corp|corporation|ltd|limited|se|lp|l\.p\.|co|company)\b/g, '')
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function formatCompanyTitle(str) {
  if (!str) return '';
  if (str.toLowerCase() === 'ebay') return 'eBay';
  if (str.includes(' ') && /[A-Z]/.test(str)) {
    return str.trim();
  }
  return str.replace(/-/g, ' ').split(' ').map(w => {
    if (!w) return '';
    const upper = w.toUpperCase();
    if (knownAcronyms.has(upper)) return upper;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ').trim();
}

// Initialize Data from LEETCODE_DATA (with company merging & capitalization normalization)
function initData() {
  companyList = [];
  const uniqueProbs = new Set();
  const topicMap = new Map();

  const mergedCompanyMap = new Map();
  const dataObj = window.LEETCODE_DATA || (typeof LEETCODE_DATA !== 'undefined' ? LEETCODE_DATA : null);

  if (!dataObj) {
    console.error("LEETCODE_DATA is not available yet!");
    return;
  }

  for (const [rawName, rawProblems] of Object.entries(dataObj)) {
    const normKey = normalizeCompanyNameKey(rawName);

    if (!mergedCompanyMap.has(normKey)) {
      mergedCompanyMap.set(normKey, {
        name: formatCompanyTitle(rawName),
        problemsMap: new Map()
      });
    } else {
      const existing = mergedCompanyMap.get(normKey);
      if (rawName.includes(' ') && /[A-Z]/.test(rawName) && (!existing.name.includes(' ') || !/[A-Z]/.test(existing.name))) {
        existing.name = rawName.trim();
      }
    }

    const companyEntry = mergedCompanyMap.get(normKey);

    rawProblems.forEach(p => {
      uniqueProbs.add(p.title);
      const tags = getTopicsForProblem(p);
      tags.forEach(t => {
        topicMap.set(t, (topicMap.get(t) || 0) + 1);
      });

      if (!companyEntry.problemsMap.has(p.title)) {
        companyEntry.problemsMap.set(p.title, {
          ...p,
          tags,
          lcNum: getLeetCodeNumber(p.url)
        });
      }
    });
  }

  // Convert merged map to companyList array
  mergedCompanyMap.forEach((entry) => {
    const problems = Array.from(entry.problemsMap.values());
    let e = 0, m = 0, h = 0;
    problems.forEach(p => {
      if (p.diff === 'Easy') e++;
      else if (p.diff === 'Medium') m++;
      else if (p.diff === 'Hard') h++;
    });

    companyList.push({
      name: entry.name,
      total: problems.length,
      e, m, h,
      problems
    });
  });

  totalUniqueCount = uniqueProbs.size;

  // Sort companies descending by total problem count by default
  companyList.sort((a, b) => b.total - a.total);
  if (companyList.length > 0) {
    maxTotal = companyList[0].total;
  }

  // Update Header Stats Widgets
  document.getElementById('stat-companies').textContent = companyList.length.toLocaleString();
  document.getElementById('stat-unique').textContent = totalUniqueCount.toLocaleString();

  // Load saved progress from localStorage on startup before updating stats if not already populated
  if (!cloudAuthoritativeDataLoaded) {
    try {
      const savedSolved = JSON.parse(localStorage.getItem('leetcode_solved_v1') || '[]');
      if (Array.isArray(savedSolved)) {
        savedSolved.forEach(title => {
          if (title && typeof title === 'string') solvedProblems.add(title.trim());
        });
      }
      const savedStarred = JSON.parse(localStorage.getItem('leetcode_starred_v1') || '[]');
      if (Array.isArray(savedStarred)) {
        savedStarred.forEach(title => {
          if (title && typeof title === 'string') starredProblems.add(title.trim());
        });
      }
      // Load solved dates
      const savedDates = JSON.parse(localStorage.getItem('leetcode_solved_dates_v1') || '{}');
      if (savedDates && typeof savedDates === 'object' && !Array.isArray(savedDates)) {
        Object.entries(savedDates).forEach(([title, date]) => {
          if (title && typeof title === 'string' && date) solvedDates.set(title.trim(), date);
        });
      }
      // Load spaced repetition review problems
      const savedReviews = JSON.parse(localStorage.getItem('leetcode_review_problems_v1') || '[]');
      if (Array.isArray(savedReviews)) {
        reviewProblems = savedReviews;
      }
    } catch (e) {
      console.error("Error loading progress from localStorage:", e);
    }
  }

  updateSolvedStats(true);
  updateStarredStats(true);
  if (typeof renderReviewTracker === 'function') renderReviewTracker();
}

function updateSolvedStats(skipCloudSync = false) {
  const statSolvedEl = document.getElementById('stat-solved');
  if (statSolvedEl) statSolvedEl.textContent = solvedProblems.size.toLocaleString();

  const backupStatSolved = document.getElementById('backup-stat-solved');
  if (backupStatSolved) backupStatSolved.textContent = solvedProblems.size.toLocaleString();

  const profileSolved = document.getElementById('profile-solved-count');
  if (profileSolved) profileSolved.textContent = solvedProblems.size.toLocaleString();

  try {
    localStorage.setItem('leetcode_solved_v1', JSON.stringify(Array.from(solvedProblems)));
    // Persist solved dates map
    const datesObj = {};
    solvedDates.forEach((date, title) => { datesObj[title] = date; });
    localStorage.setItem('leetcode_solved_dates_v1', JSON.stringify(datesObj));
  } catch (e) {
    console.error("Error saving solved problems to localStorage:", e);
  }

  // Update Overall Progress Bar
  const pct = totalUniqueCount > 0 ? ((solvedProblems.size / totalUniqueCount) * 100).toFixed(1) : 0;
  const fillEl = document.getElementById('overall-progress-fill');
  const textEl = document.getElementById('overall-progress-text');
  if (fillEl) fillEl.style.width = `${pct}%`;
  if (textEl) textEl.textContent = `${solvedProblems.size} / ${totalUniqueCount} (${pct}%) Completed`;

  if (!skipCloudSync) {
    syncToCloudDebounced();
  }
}

function updateStarredStats(skipCloudSync = false) {
  const statStarredEl = document.getElementById('stat-starred');
  if (statStarredEl) statStarredEl.textContent = starredProblems.size.toLocaleString();

  const backupStatStarred = document.getElementById('backup-stat-starred');
  if (backupStatStarred) backupStatStarred.textContent = starredProblems.size.toLocaleString();

  const profileStarred = document.getElementById('profile-starred-count');
  if (profileStarred) profileStarred.textContent = starredProblems.size.toLocaleString();

  try {
    localStorage.setItem('leetcode_starred_v1', JSON.stringify(Array.from(starredProblems)));
  } catch (e) {
    console.error("Error saving starred problems to localStorage:", e);
  }

  if (!skipCloudSync) {
    syncToCloudDebounced();
  }
}

// Company Sorting
function sortCompanies() {
  const mode = document.getElementById('company-sort').value;
  if (mode === 'solved') {
    companyList.sort((a, b) => {
      const aSolved = a.problems.filter(p => solvedProblems.has(p.title)).length;
      const bSolved = b.problems.filter(p => solvedProblems.has(p.title)).length;
      const aPct = a.total > 0 ? aSolved / a.total : 0;
      const bPct = b.total > 0 ? bSolved / b.total : 0;
      return bPct - aPct || b.total - a.total;
    });
  } else if (mode === 'name') {
    companyList.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    companyList.sort((a, b) => b.total - a.total);
  }
  filterCompanies();
}

// ----------------------------------------------------
// 1. HOME VIEW: List of Ranked Companies
// ----------------------------------------------------
let currentRenderToken = 0;

function renderCompanies(dataToRender = companyList) {
  const compTbody = document.getElementById('companies-tbody');
  compTbody.innerHTML = '';

  const renderToken = ++currentRenderToken;
  const CHUNK_SIZE = 50;
  let idx = 0;

  function renderChunk() {
    if (renderToken !== currentRenderToken) return;

    const frag = document.createDocumentFragment();
    const end = Math.min(idx + CHUNK_SIZE, dataToRender.length);

    for (; idx < end; idx++) {
      const c = dataToRender[idx];
      const tr = document.createElement('tr');
      tr.className = 'row';
      tr.onclick = () => openCompany(c);

      let companySolved = 0;
      c.problems.forEach(p => {
        if (solvedProblems.has(p.title)) companySolved++;
      });

      const relPct = Math.max(((c.total / maxTotal) * 100).toFixed(1), 1.5);
      const solvedPct = c.total > 0 ? Math.round((companySolved / c.total) * 100) : 0;

      tr.innerHTML = `
        <td class="rank">#${idx + 1}</td>
        <td class="company-name">
          ${c.name}
          <div style="font-size:11px; color:var(--text-secondary); font-weight:normal; margin-top:2px;">
            ${companySolved}/${c.total} solved (${solvedPct}%)
          </div>
        </td>
        <td class="bar">
          <div class="bar-bg"><div class="barfill" style="width:${relPct}%"></div></div>
        </td>
        <td class="count c-total">${c.total}</td>
        <td class="count c-easy">${c.e}</td>
        <td class="count c-med">${c.m}</td>
        <td class="count c-hard">${c.h}</td>
      `;
      frag.appendChild(tr);
    }

    compTbody.appendChild(frag);

    if (idx < dataToRender.length) {
      requestAnimationFrame(renderChunk);
    }
  }

  if (dataToRender.length === 0) {
    compTbody.innerHTML = `<tr><td colspan="7" class="empty-state">No matching companies found.</td></tr>`;
  } else {
    renderChunk();
  }
}

function filterCompanies() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  const resultsDiv = document.getElementById('home-problems-results');

  if (!q) {
    if (resultsDiv) resultsDiv.style.display = 'none';
    renderCompanies(companyList);
    return;
  }

  // Detect if the query is a LeetCode problem number (e.g. "1", "#42")
  const lcNumQuery = parseLeetCodeNumberQuery(q);

  // 1. Filter Companies
  const filteredCompanies = companyList.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.problems.some(p => {
      if (lcNumQuery !== null && p.lcNum === lcNumQuery) return true;
      return p.title.toLowerCase().includes(q) || (p.tags && p.tags.some(t => t.toLowerCase().includes(q)));
    })
  );

  // 2. Filter & Deduplicate Individual Problems Across All Companies by Title
  const probMap = new Map();
  companyList.forEach(c => {
    c.problems.forEach(p => {
      const normTitle = p.title.trim();
      const lowerTitle = normTitle.toLowerCase();
      let matches = lowerTitle.includes(q) || (p.tags && p.tags.some(t => t.toLowerCase().includes(q)));

      // Also match by LeetCode number
      if (!matches && lcNumQuery !== null && p.lcNum === lcNumQuery) {
        matches = true;
      }

      if (matches) {
        if (!probMap.has(normTitle)) {
          probMap.set(normTitle, {
            ...p,
            title: normTitle,
            companies: [c.name]
          });
        } else {
          const existing = probMap.get(normTitle);
          if (!existing.companies.includes(c.name)) {
            existing.companies.push(c.name);
          }
        }
      }
    });
  });

  // If searching by number, prioritize companies that contain the exact question
  if (lcNumQuery !== null) {
    filteredCompanies.sort((a, b) => {
      const aHasExact = a.problems.some(p => p.lcNum === lcNumQuery);
      const bHasExact = b.problems.some(p => p.lcNum === lcNumQuery);
      if (aHasExact && !bHasExact) return -1;
      if (!aHasExact && bHasExact) return 1;
      return b.total - a.total;
    });
  }

  const uniqueMatchedProblems = (typeof sortSearchResults === 'function')
    ? sortSearchResults(Array.from(probMap.values()), q, lcNumQuery)
    : sortProblemsByTopic(Array.from(probMap.values()));

  if (uniqueMatchedProblems.length > 0 && resultsDiv) {
    resultsDiv.style.display = 'block';
    document.getElementById('home-probs-count').textContent = uniqueMatchedProblems.length;
    renderHomeProblemsResults(uniqueMatchedProblems.slice(0, 100)); // Render top 100 unique matches for fast rendering
  } else if (resultsDiv) {
    resultsDiv.style.display = 'none';
  }

  renderCompanies(filteredCompanies);
}

function renderHomeProblemsResults(problemsList) {
  const tbody = document.getElementById('home-probs-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const frag = document.createDocumentFragment();

  problemsList.forEach(p => {
    const tr = document.createElement('tr');
    tr.className = 'row';

    const isSolved = solvedProblems.has(p.title);
    const isStarred = starredProblems.has(p.title);

    const tagsHTML = p.tags && p.tags.length > 0 ? `<div class="tags-row">${p.tags.map(t => `<span class="topic-tag">${escapeHtml(t)}</span>`).join('')}</div>` : '';

    // Render company badges cleanly
    let companyBadgeHTML = '';
    if (p.companies && p.companies.length > 0) {
      const maxShown = 2;
      const shown = p.companies.slice(0, maxShown);
      const remaining = p.companies.length - maxShown;

      companyBadgeHTML = shown.map(comp => 
        `<button class="back-btn" data-comp="${escapeHtml(comp)}" style="padding: 2px 7px; font-size: 11px; margin-right: 4px; margin-bottom: 2px;" onclick="event.stopPropagation(); openCompanyByName(this.dataset.comp)">🏢 ${escapeHtml(comp)}</button>`
      ).join('');

      if (remaining > 0) {
        companyBadgeHTML += `<span style="font-size: 11px; color: var(--text-secondary); font-family: var(--mono);" title="${escapeHtml(p.companies.join(', '))}">+${remaining} more</span>`;
      }
    }

    tr.innerHTML = `
      <td class="cb-cell">
        <input type="checkbox" class="status-cb" ${isSolved ? 'checked' : ''}>
      </td>
      <td style="text-align:center;">
        <button class="star-btn ${isStarred ? 'starred' : ''}" title="${isStarred ? 'Unstar' : 'Bookmark for revision'}">
          ★
        </button>
      </td>
      <td>
        <div class="prob-title">
          <a href="${p.url}" target="_blank" class="${isSolved ? 'completed' : ''}">${getProblemNumberBadgeHtml(p)}${escapeHtml(p.title)}</a>
          ${tagsHTML}
        </div>
      </td>
      <td>
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 2px;">
          ${companyBadgeHTML}
        </div>
      </td>
      <td style="text-align:right;"><span class="tag ${p.diff}">${p.diff}</span></td>
      <td style="text-align:right;"><span class="srctag">${p.src || 'L+S'}</span></td>
    `;

    // Direct Event Listeners
    const cb = tr.querySelector('.status-cb');
    cb.addEventListener('click', (e) => toggleSolved(p.title, e));

    const starBtn = tr.querySelector('.star-btn');
    starBtn.addEventListener('click', (e) => toggleStar(p.title, e));

    frag.appendChild(tr);
  });

  tbody.appendChild(frag);
}

function openCompanyByName(compName) {
  const found = companyList.find(c => c.name === compName);
  if (found) {
    openCompany(found);
  }
}

// ----------------------------------------------------
// 2. COMPANY TOPICS VIEW: Topics for Selected Company
// ----------------------------------------------------
function openCompany(companyObj) {
  currentCompanyObj = companyObj;
  document.getElementById('company-topics-title').textContent = `${companyObj.name} LeetCode Topics`;

  document.getElementById('home-view').classList.add('hidden');
  document.getElementById('bookmarks-view')?.classList.remove('active');
  document.getElementById('solved-view')?.classList.remove('active');
  document.getElementById('company-topics-view').classList.add('active');
  document.getElementById('topic-problems-view').classList.remove('active');

  const searchEl = document.getElementById('topic-search');
  if (searchEl) searchEl.value = '';

  window.scrollTo(0, 0);
  renderCompanyTopics();
}

function filterCompanyTopics() {
  renderCompanyTopics();
}

function renderCompanyTopics() {
  const grid = document.getElementById('topics-grid');
  if (!grid || !currentCompanyObj) return;
  grid.innerHTML = '';

  const query = (document.getElementById('topic-search')?.value || '').trim().toLowerCase();

  // Aggregate topics for this company's problems
  const topicMap = new Map();

  // Special "All Questions" card
  topicMap.set('All Questions', {
    name: 'All Questions',
    icon: '🌟',
    problems: currentCompanyObj.problems,
    total: currentCompanyObj.problems.length,
    e: currentCompanyObj.e,
    m: currentCompanyObj.m,
    h: currentCompanyObj.h
  });

  // Special "⭐ Bookmarked Questions" card for this company
  const companyStarred = currentCompanyObj.problems.filter(p => starredProblems.has(p.title));
  topicMap.set('⭐ Bookmarked Questions', {
    name: '⭐ Bookmarked Questions',
    icon: '⭐',
    problems: companyStarred,
    total: companyStarred.length,
    e: companyStarred.filter(p => p.diff === 'Easy').length,
    m: companyStarred.filter(p => p.diff === 'Medium').length,
    h: companyStarred.filter(p => p.diff === 'Hard').length
  });

  // Special "✅ Solved Questions" card for this company
  const companySolved = currentCompanyObj.problems.filter(p => solvedProblems.has(p.title));
  topicMap.set('✅ Solved Questions', {
    name: '✅ Solved Questions',
    icon: '✅',
    problems: companySolved,
    total: companySolved.length,
    e: companySolved.filter(p => p.diff === 'Easy').length,
    m: companySolved.filter(p => p.diff === 'Medium').length,
    h: companySolved.filter(p => p.diff === 'Hard').length
  });

  currentCompanyObj.problems.forEach(p => {
    p.tags.forEach(tName => {
      if (!topicMap.has(tName)) {
        topicMap.set(tName, {
          name: tName,
          icon: getTopicIcon(tName),
          problems: [],
          total: 0,
          e: 0, m: 0, h: 0
        });
      }

      const item = topicMap.get(tName);
      item.problems.push(p);
      item.total++;
      if (p.diff === 'Easy') item.e++;
      else if (p.diff === 'Medium') item.m++;
      else if (p.diff === 'Hard') item.h++;
    });
  });

  const topicsList = Array.from(topicMap.values());
  topicsList.sort((a, b) => getTopicOrder(a.name) - getTopicOrder(b.name));

  // Filter topics by query: match topic name OR any problem title/number inside the topic!
  const topicQueryLcNum = query ? parseLeetCodeNumberQuery(query) : null;
  const filteredTopics = query ? topicsList.filter(t => 
    t.name.toLowerCase().includes(query) ||
    t.problems.some(p => {
      if (topicQueryLcNum !== null && p.lcNum === topicQueryLcNum) return true;
      return p.title.toLowerCase().includes(query);
    })
  ) : topicsList;

  filteredTopics.forEach(t => {
    let topicSolved = 0;
    t.problems.forEach(p => {
      if (solvedProblems.has(p.title)) topicSolved++;
    });

    const solvedPct = t.total > 0 ? Math.round((topicSolved / t.total) * 100) : 0;

    const card = document.createElement('div');
    card.className = 'topic-card';
    card.onclick = () => openCompanyTopic(t.name);

    card.innerHTML = `
      <div class="topic-card-top">
        <div class="topic-icon">${t.icon}</div>
        <div class="topic-info">
          <h3>${escapeHtml(t.name)}</h3>
          <p>${topicSolved}/${t.total} solved (${solvedPct}%)</p>
        </div>
      </div>

      <div class="topic-diff-counts">
        <span class="diff-badge easy">Easy: ${t.e}</span>
        <span class="diff-badge med">Med: ${t.m}</span>
        <span class="diff-badge hard">Hard: ${t.h}</span>
      </div>
    `;

    grid.appendChild(card);
  });

  if (filteredTopics.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">No matching topics found in ${escapeHtml(currentCompanyObj.name)}.</div>`;
  }
}

// ----------------------------------------------------
// 3. TOPIC PROBLEMS VIEW: Arranged by Easy, Medium, Hard
// ----------------------------------------------------
function openCompanyTopic(topicName) {
  currentTopicName = topicName;
  currentTopicFilter = 'All';

  document.getElementById('company-topics-view').classList.remove('active');
  document.getElementById('topic-problems-view').classList.add('active');

  document.getElementById('topic-breadcrumb').textContent = `${currentCompanyObj.name} > ${topicName}`;
  document.getElementById('topic-title').textContent = `${topicName} Questions`;

  const searchEl = document.getElementById('topic-prob-search');
  if (searchEl) searchEl.value = '';

  // Reset active filter button to All
  document.querySelectorAll('#topic-filters-container .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.diff === 'All');
  });

  window.scrollTo(0, 0);
  renderTopicProblems();
}

function setTopicFilter(diff) {
  currentTopicFilter = diff;
  document.querySelectorAll('#topic-filters-container .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.diff === diff);
  });
  renderTopicProblems();
}

function renderTopicProblems() {
  if (!currentCompanyObj || !currentTopicName) return;

  // Get problem pool for this topic
  let pool = [];
  if (currentTopicName === 'All Questions') {
    pool = currentCompanyObj.problems;
  } else if (currentTopicName === '⭐ Bookmarked Questions') {
    pool = currentCompanyObj.problems.filter(p => starredProblems.has(p.title));
  } else if (currentTopicName === '✅ Solved Questions') {
    pool = currentCompanyObj.problems.filter(p => solvedProblems.has(p.title));
  } else {
    pool = currentCompanyObj.problems.filter(p => p.tags.includes(currentTopicName));
  }

  // Apply Status / Difficulty Filter
  if (currentTopicFilter === 'Easy' || currentTopicFilter === 'Medium' || currentTopicFilter === 'Hard') {
    pool = pool.filter(p => p.diff === currentTopicFilter);
  } else if (currentTopicFilter === 'Solved') {
    pool = pool.filter(p => solvedProblems.has(p.title));
  } else if (currentTopicFilter === 'Starred') {
    pool = pool.filter(p => starredProblems.has(p.title));
  }

  // Apply Problem Search Filter
  const query = (document.getElementById('topic-prob-search')?.value || '').trim().toLowerCase();
  if (query) {
    const topicLcNum = parseLeetCodeNumberQuery(query);
    pool = pool.filter(p =>
      p.title.toLowerCase().includes(query) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(query))) ||
      (topicLcNum !== null && p.lcNum === topicLcNum)
    );
  }

  // Sort problems: exact number match first, then topic-wise (basic→advanced)
  pool = (typeof sortSearchResults === 'function')
    ? sortSearchResults(pool, query, query ? parseLeetCodeNumberQuery(query) : null)
    : sortProblemsByTopic(pool);

  // Group into Easy, Medium, Hard
  const easyProblems = pool.filter(p => p.diff === 'Easy');
  const medProblems = pool.filter(p => p.diff === 'Medium');
  const hardProblems = pool.filter(p => p.diff === 'Hard');

  // Update Section Badges
  document.getElementById('count-easy').textContent = `${easyProblems.length} Problems`;
  document.getElementById('count-medium').textContent = `${medProblems.length} Problems`;
  document.getElementById('count-hard').textContent = `${hardProblems.length} Problems`;

  // Render Table Sections
  renderProblemTableSection('tbody-easy', 'section-easy', easyProblems);
  renderProblemTableSection('tbody-medium', 'section-medium', medProblems);
  renderProblemTableSection('tbody-hard', 'section-hard', hardProblems);
}

// Sort problems by primary topic order (basic→advanced), then alphabetically by title
function sortProblemsByTopic(problems) {
  return [...problems].sort((a, b) => {
    const aTopicOrder = getPrimaryTopicOrder(a);
    const bTopicOrder = getPrimaryTopicOrder(b);
    if (aTopicOrder !== bTopicOrder) return aTopicOrder - bTopicOrder;
    return a.title.localeCompare(b.title);
  });
}

// Get the lowest (most basic) topic order for a problem's tags
function getPrimaryTopicOrder(problem) {
  if (!problem.tags || problem.tags.length === 0) return 99;
  let minOrder = 99;
  problem.tags.forEach(t => {
    const order = getTopicOrder(t);
    if (order < minOrder) minOrder = order;
  });
  return minOrder;
}

function renderProblemTableSection(tbodyId, sectionId, problemsList) {
  const tbody = document.getElementById(tbodyId);
  const section = document.getElementById(sectionId);
  if (!tbody || !section) return;

  tbody.innerHTML = '';

  if (problemsList.length === 0) {
    if (currentTopicFilter !== 'All' && currentTopicFilter !== 'Solved' && currentTopicFilter !== 'Starred') {
      // Hide section if difficulty filter doesn't match
      section.style.display = 'none';
    } else {
      section.style.display = 'block';
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state" style="padding: 24px 16px;">No questions in this section.</td></tr>`;
    }
    return;
  }

  section.style.display = 'block';
  const frag = document.createDocumentFragment();

  // Track the last topic sub-header to insert topic dividers in "All Questions" view
  let lastTopicHeader = '';

  problemsList.forEach(p => {
    // Insert topic sub-header row when viewing "All Questions"
    if (currentTopicName === 'All Questions' && p.tags && p.tags.length > 0) {
      const primaryTopic = getPrimaryTopicName(p);
      if (primaryTopic !== lastTopicHeader) {
        lastTopicHeader = primaryTopic;
        const headerTr = document.createElement('tr');
        headerTr.className = 'topic-subheader-row';
        const topicIcon = getTopicIcon(primaryTopic);
        headerTr.innerHTML = `<td colspan="5" class="topic-subheader">${topicIcon} ${escapeHtml(primaryTopic)}</td>`;
        frag.appendChild(headerTr);
      }
    }

    const tr = document.createElement('tr');
    tr.className = 'row';

    const isSolved = solvedProblems.has(p.title);
    const isStarred = starredProblems.has(p.title);

    const tagsHTML = p.tags && p.tags.length > 0 ? `<div class="tags-row">${p.tags.map(t => `<span class="topic-tag">${escapeHtml(t)}</span>`).join('')}</div>` : '';

    tr.innerHTML = `
      <td class="cb-cell">
        <input type="checkbox" class="status-cb" ${isSolved ? 'checked' : ''}>
      </td>
      <td style="text-align:center;">
        <button class="star-btn ${isStarred ? 'starred' : ''}" title="${isStarred ? 'Unstar' : 'Bookmark for revision'}">
          ★
        </button>
      </td>
      <td>
        <div class="prob-title">
          <a href="${p.url}" target="_blank" class="${isSolved ? 'completed' : ''}">${getProblemNumberBadgeHtml(p)}${escapeHtml(p.title)}</a>
          ${tagsHTML}
        </div>
      </td>
      <td style="text-align:right;"><span class="tag ${p.diff}">${p.diff}</span></td>
      <td style="text-align:right;"><span class="srctag">${p.src || 'L+S'}</span></td>
    `;

    // Direct Event Listeners
    const cb = tr.querySelector('.status-cb');
    cb.addEventListener('click', (e) => toggleSolved(p.title, e));

    const starBtn = tr.querySelector('.star-btn');
    starBtn.addEventListener('click', (e) => toggleStar(p.title, e));

    tr.querySelectorAll('.topic-tag').forEach(tagEl => {
      tagEl.addEventListener('click', (e) => {
        e.stopPropagation();
        openCompanyTopic(tagEl.textContent);
      });
    });

    frag.appendChild(tr);
  });

  tbody.appendChild(frag);
}

// ----------------------------------------------------
// 4. BOOKMARKS VIEW: All Bookmarked Questions
// ----------------------------------------------------
let currentBookmarkFilter = 'All';

function openBookmarksView() {
  document.getElementById('home-view').classList.add('hidden');
  document.getElementById('company-topics-view')?.classList.remove('active');
  document.getElementById('topic-problems-view')?.classList.remove('active');
  document.getElementById('solved-view')?.classList.remove('active');
  document.getElementById('bookmarks-view')?.classList.add('active');

  const searchEl = document.getElementById('bookmarks-search');
  if (searchEl) searchEl.value = '';

  setBookmarkFilter('All');
  window.scrollTo(0, 0);
}

function setBookmarkFilter(diff) {
  currentBookmarkFilter = diff;
  document.querySelectorAll('#bookmarks-filters-container .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.diff === diff);
  });
  renderBookmarksView();
}

function renderBookmarksView() {
  const query = (document.getElementById('bookmarks-search')?.value || '').trim().toLowerCase();

  // Deduplicate and aggregate starred problems across all companies
  const probMap = new Map();
  companyList.forEach(c => {
    c.problems.forEach(p => {
      if (!starredProblems.has(p.title)) return;

      const normTitle = p.title.trim();
      if (!probMap.has(normTitle)) {
        probMap.set(normTitle, {
          ...p,
          title: normTitle,
          companies: [c.name]
        });
      } else {
        const existing = probMap.get(normTitle);
        if (!existing.companies.includes(c.name)) {
          existing.companies.push(c.name);
        }
      }
    });
  });

  let pool = Array.from(probMap.values());

  // Apply Status / Difficulty Filter
  if (currentBookmarkFilter === 'Easy' || currentBookmarkFilter === 'Medium' || currentBookmarkFilter === 'Hard') {
    pool = pool.filter(p => p.diff === currentBookmarkFilter);
  } else if (currentBookmarkFilter === 'Solved') {
    pool = pool.filter(p => solvedProblems.has(p.title));
  }

  // Apply Search Query Filter (title, topic tags, company names, or LC number)
  if (query) {
    const bmLcNum = parseLeetCodeNumberQuery(query);
    pool = pool.filter(p =>
      p.title.toLowerCase().includes(query) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(query))) ||
      (p.companies && p.companies.some(c => c.toLowerCase().includes(query))) ||
      (bmLcNum !== null && p.lcNum === bmLcNum)
    );
  }

  const emptyState = document.getElementById('bookmarks-empty-state');
  if (pool.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    document.getElementById('bm-section-easy').style.display = 'none';
    document.getElementById('bm-section-medium').style.display = 'none';
    document.getElementById('bm-section-hard').style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  // Sort problems: exact number match first, then topic-wise (basic→advanced)
  pool = (typeof sortSearchResults === 'function')
    ? sortSearchResults(pool, query, query ? parseLeetCodeNumberQuery(query) : null)
    : sortProblemsByTopic(pool);

  const easyProblems = pool.filter(p => p.diff === 'Easy');
  const medProblems = pool.filter(p => p.diff === 'Medium');
  const hardProblems = pool.filter(p => p.diff === 'Hard');

  document.getElementById('bm-count-easy').textContent = `${easyProblems.length} Problems`;
  document.getElementById('bm-count-medium').textContent = `${medProblems.length} Problems`;
  document.getElementById('bm-count-hard').textContent = `${hardProblems.length} Problems`;

  renderBookmarkTableSection('bm-tbody-easy', 'bm-section-easy', easyProblems);
  renderBookmarkTableSection('bm-tbody-medium', 'bm-section-medium', medProblems);
  renderBookmarkTableSection('bm-tbody-hard', 'bm-section-hard', hardProblems);
}

function renderBookmarkTableSection(tbodyId, sectionId, problemsList) {
  const tbody = document.getElementById(tbodyId);
  const section = document.getElementById(sectionId);
  if (!tbody || !section) return;

  tbody.innerHTML = '';

  if (problemsList.length === 0) {
    if (currentBookmarkFilter !== 'All' && currentBookmarkFilter !== 'Solved') {
      section.style.display = 'none';
    } else {
      section.style.display = 'block';
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state" style="padding: 24px 16px;">No questions in this section.</td></tr>`;
    }
    return;
  }

  section.style.display = 'block';
  const frag = document.createDocumentFragment();

  problemsList.forEach(p => {
    const tr = document.createElement('tr');
    tr.className = 'row';

    const isSolved = solvedProblems.has(p.title);
    const isStarred = starredProblems.has(p.title);

    const tagsHTML = p.tags && p.tags.length > 0 ? `<div class="tags-row">${p.tags.map(t => `<span class="topic-tag">${escapeHtml(t)}</span>`).join('')}</div>` : '';

    let companyBadgeHTML = '';
    if (p.companies && p.companies.length > 0) {
      const maxShown = 2;
      const shown = p.companies.slice(0, maxShown);
      const remaining = p.companies.length - maxShown;

      companyBadgeHTML = shown.map(comp => 
        `<button class="back-btn" data-comp="${escapeHtml(comp)}" style="padding: 2px 7px; font-size: 11px; margin-right: 4px; margin-bottom: 2px;" onclick="event.stopPropagation(); openCompanyByName(this.dataset.comp)">🏢 ${escapeHtml(comp)}</button>`
      ).join('');

      if (remaining > 0) {
        companyBadgeHTML += `<span style="font-size: 11px; color: var(--text-secondary); font-family: var(--mono);" title="${escapeHtml(p.companies.join(', '))}">+${remaining} more</span>`;
      }
    }

    tr.innerHTML = `
      <td class="cb-cell">
        <input type="checkbox" class="status-cb" ${isSolved ? 'checked' : ''}>
      </td>
      <td style="text-align:center;">
        <button class="star-btn ${isStarred ? 'starred' : ''}" title="${isStarred ? 'Unstar' : 'Bookmark for revision'}">
          ★
        </button>
      </td>
      <td>
        <div class="prob-title">
          <a href="${p.url}" target="_blank" class="${isSolved ? 'completed' : ''}">${getProblemNumberBadgeHtml(p)}${escapeHtml(p.title)}</a>
          ${tagsHTML}
        </div>
      </td>
      <td>
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 2px;">
          ${companyBadgeHTML}
        </div>
      </td>
      <td style="text-align:right;"><span class="tag ${p.diff}">${p.diff}</span></td>
      <td style="text-align:right;"><span class="srctag">${p.src || 'L+S'}</span></td>
    `;

    const cb = tr.querySelector('.status-cb');
    cb.addEventListener('click', (e) => toggleSolved(p.title, e));

    const starBtn = tr.querySelector('.star-btn');
    starBtn.addEventListener('click', (e) => toggleStar(p.title, e));

    frag.appendChild(tr);
  });

  tbody.appendChild(frag);
}

// Get the primary (most basic) topic name for a problem
function getPrimaryTopicName(problem) {
  if (!problem.tags || problem.tags.length === 0) return 'General DSA';
  let minOrder = 99;
  let primaryName = problem.tags[0];
  problem.tags.forEach(t => {
    const order = getTopicOrder(t);
    if (order < minOrder) {
      minOrder = order;
      primaryName = t;
    }
  });
  return primaryName;
}

// ----------------------------------------------------
// Navigation & State Handlers
// ----------------------------------------------------
function goBackToCompanyTopics() {
  document.getElementById('topic-problems-view').classList.remove('active');
  document.getElementById('company-topics-view').classList.add('active');
  currentTopicName = null;
  renderCompanyTopics();
}

function goHome() {
  document.getElementById('company-topics-view').classList.remove('active');
  document.getElementById('topic-problems-view').classList.remove('active');
  document.getElementById('bookmarks-view')?.classList.remove('active');
  document.getElementById('solved-view')?.classList.remove('active');
  document.getElementById('home-view').classList.remove('hidden');
  currentCompanyObj = null;
  currentTopicName = null;
  renderCompanies();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Toggle Solved Status
function toggleSolved(title, event) {
  if (event && event.stopPropagation) event.stopPropagation();
  const cleanTitle = typeof title === 'string' ? title.trim() : title;

  if (solvedProblems.has(cleanTitle)) {
    solvedProblems.delete(cleanTitle);
    solvedDates.delete(cleanTitle);
  } else {
    solvedProblems.delete(title);
    solvedDates.delete(title);
    solvedProblems.add(cleanTitle);
    solvedDates.set(cleanTitle, new Date().toISOString());
  }

  updateSolvedStats();
  if (typeof renderSolvedHeatmap === 'function') renderSolvedHeatmap();

  if (document.getElementById('solved-view')?.classList.contains('active')) {
    renderSolvedView();
  } else if (document.getElementById('bookmarks-view')?.classList.contains('active')) {
    renderBookmarksView();
  } else if (document.getElementById('topic-problems-view')?.classList.contains('active')) {
    renderTopicProblems();
  } else if (document.getElementById('company-topics-view')?.classList.contains('active')) {
    renderCompanyTopics();
  } else if (!document.getElementById('home-view')?.classList.contains('hidden')) {
    filterCompanies();
  }
}

// Toggle Starred / Bookmarked Status
function toggleStar(title, event) {
  if (event && event.stopPropagation) event.stopPropagation();
  const cleanTitle = typeof title === 'string' ? title.trim() : title;

  if (starredProblems.has(cleanTitle)) {
    starredProblems.delete(cleanTitle);
  } else {
    starredProblems.delete(title);
    starredProblems.add(cleanTitle);
  }

  updateStarredStats();

  if (document.getElementById('solved-view')?.classList.contains('active')) {
    renderSolvedView();
  } else if (document.getElementById('bookmarks-view')?.classList.contains('active')) {
    renderBookmarksView();
  } else if (document.getElementById('topic-problems-view')?.classList.contains('active')) {
    renderTopicProblems();
  } else if (document.getElementById('company-topics-view')?.classList.contains('active')) {
    renderCompanyTopics();
  } else if (!document.getElementById('home-view')?.classList.contains('hidden')) {
    filterCompanies();
  }
}

// Random Problem Picker
function pickRandomProblem() {
  const dataObj = window.LEETCODE_DATA || (typeof LEETCODE_DATA !== 'undefined' ? LEETCODE_DATA : {});
  const pool = currentCompanyObj ? currentCompanyObj.problems : Object.values(dataObj).flat();
  if (!pool || pool.length === 0) return;

  const randomProblem = pool[Math.floor(Math.random() * pool.length)];

  document.getElementById('modal-title').textContent = randomProblem.title;
  document.getElementById('modal-desc').textContent = `Company: ${currentCompanyObj ? currentCompanyObj.name : 'Random Selection'} | Difficulty: ${randomProblem.diff}`;
  document.getElementById('modal-link').href = randomProblem.url;

  document.getElementById('random-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('random-modal').classList.remove('active');
}

// ============================================================
// DATA BACKUP & RESTORE (EXPORT / IMPORT) WITH LOCALSTORAGE SYNC
// ============================================================

function openBackupModal() {
  const statSolvedEl = document.getElementById('backup-stat-solved');
  const statStarredEl = document.getElementById('backup-stat-starred');
  if (statSolvedEl) statSolvedEl.textContent = solvedProblems.size.toLocaleString();
  if (statStarredEl) statStarredEl.textContent = starredProblems.size.toLocaleString();

  // Reset file input & paste area
  const fileInput = document.getElementById('backup-file-input');
  if (fileInput) fileInput.value = '';
  const pasteArea = document.getElementById('import-paste-area');
  if (pasteArea) pasteArea.value = '';
  const dropzoneText = document.getElementById('dropzone-text');
  if (dropzoneText) dropzoneText.textContent = 'Click to choose JSON file or drag & drop';

  document.getElementById('backup-modal')?.classList.add('active');
}

function closeBackupModal() {
  document.getElementById('backup-modal')?.classList.remove('active');
}

function generateBackupPayload() {
  const solvedDatesObj = {};
  solvedDates.forEach((date, title) => { solvedDatesObj[title] = date; });
  return {
    version: '1.2',
    app: 'DSA Tracker',
    exportedAt: new Date().toISOString(),
    stats: {
      solvedCount: solvedProblems.size,
      starredCount: starredProblems.size,
      reviewCount: reviewProblems.length
    },
    solvedProblems: Array.from(solvedProblems),
    starredProblems: Array.from(starredProblems),
    solvedDates: solvedDatesObj,
    reviewProblems: reviewProblems
  };
}

function exportDataToFile() {
  try {
    const payload = generateBackupPayload();
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `dsa-tracker-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast(`✅ Exported ${payload.stats.solvedCount} solved & ${payload.stats.starredCount} bookmarked questions!`, 'success');
  } catch (err) {
    console.error('Export error:', err);
    showToast('❌ Failed to export backup file.', 'error');
  }
}

async function copyBackupToClipboard() {
  try {
    const payload = generateBackupPayload();
    const jsonStr = JSON.stringify(payload, null, 2);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(jsonStr);
    } else {
      const ta = document.createElement('textarea');
      ta.value = jsonStr;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }

    showToast('📋 Backup JSON copied to clipboard!', 'success');
  } catch (err) {
    console.error('Clipboard copy error:', err);
    showToast('❌ Failed to copy to clipboard.', 'error');
  }
}

function parseImportJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error('Invalid JSON format. Please ensure your backup is valid JSON.');
  }

  if (!parsed) {
    throw new Error('Empty JSON backup.');
  }

  let solvedList = [];
  let starredList = [];
  let solvedDatesObj = {};
  let reviewList = [];

  // Format 1: Standard structured format { solvedProblems: [...], starredProblems: [...] }
  if (Array.isArray(parsed.solvedProblems)) {
    solvedList = parsed.solvedProblems;
  } else if (Array.isArray(parsed.solved)) {
    solvedList = parsed.solved;
  } else if (Array.isArray(parsed.leetcode_solved_v1)) {
    solvedList = parsed.leetcode_solved_v1;
  }

  if (Array.isArray(parsed.starredProblems)) {
    starredList = parsed.starredProblems;
  } else if (Array.isArray(parsed.starred)) {
    starredList = parsed.starred;
  } else if (Array.isArray(parsed.leetcode_starred_v1)) {
    starredList = parsed.leetcode_starred_v1;
  }

  // Extract review problems if present
  if (Array.isArray(parsed.reviewProblems)) {
    reviewList = parsed.reviewProblems;
  }

  // Extract solved dates if present (v1.1 backup format)
  if (parsed.solvedDates && typeof parsed.solvedDates === 'object' && !Array.isArray(parsed.solvedDates)) {
    solvedDatesObj = parsed.solvedDates;
  }

  // Format 2: Raw Array of solved problems
  if (Array.isArray(parsed) && solvedList.length === 0 && starredList.length === 0) {
    solvedList = parsed;
  }

  // Sanitize: ensure string array, trimmed, remove empties
  solvedList = solvedList.filter(item => item && typeof item === 'string').map(s => s.trim()).filter(Boolean);
  starredList = starredList.filter(item => item && typeof item === 'string').map(s => s.trim()).filter(Boolean);

  if (solvedList.length === 0 && starredList.length === 0 && reviewList.length === 0) {
    throw new Error('No valid solved, bookmarked, or review questions found in this backup.');
  }

  return { solvedList, starredList, solvedDatesObj, reviewList };
}

function processImportJsonString(jsonString) {
  try {
    const { solvedList, starredList, solvedDatesObj, reviewList } = parseImportJson(jsonString);

    const mode = document.querySelector('input[name="import-mode"]:checked')?.value || 'merge';

    if (mode === 'overwrite') {
      solvedProblems = new Set(solvedList);
      starredProblems = new Set(starredList);
      solvedDates = new Map();
      Object.entries(solvedDatesObj || {}).forEach(([t, d]) => solvedDates.set(t, d));
      if (Array.isArray(reviewList)) reviewProblems = reviewList;
    } else {
      // Merge mode: only set date if not already tracked
      solvedList.forEach(p => {
        solvedProblems.add(p);
        if (!solvedDates.has(p) && solvedDatesObj && solvedDatesObj[p]) {
          solvedDates.set(p, solvedDatesObj[p]);
        }
      });
      starredList.forEach(p => starredProblems.add(p));
      if (Array.isArray(reviewList)) {
        const existingIds = new Set(reviewProblems.map(p => p.id));
        reviewList.forEach(r => {
          if (r && r.id && !existingIds.has(r.id)) {
            reviewProblems.push(r);
            existingIds.add(r.id);
          }
        });
      }
    }

    // Persist to localStorage using existing storage keys & update UI
    updateSolvedStats();
    updateStarredStats();
    saveReviewProblems();
    if (typeof renderReviewTracker === 'function') renderReviewTracker();

    // Re-render currently active view
    if (document.getElementById('solved-view')?.classList.contains('active')) {
      renderSolvedView();
    } else if (document.getElementById('bookmarks-view')?.classList.contains('active')) {
      renderBookmarksView();
    } else if (document.getElementById('topic-problems-view')?.classList.contains('active')) {
      renderTopicProblems();
    } else if (document.getElementById('company-topics-view')?.classList.contains('active')) {
      renderCompanyTopics();
    } else if (!document.getElementById('home-view')?.classList.contains('hidden')) {
      filterCompanies();
    }

    // Update modal stats
    const statSolvedEl = document.getElementById('backup-stat-solved');
    const statStarredEl = document.getElementById('backup-stat-starred');
    if (statSolvedEl) statSolvedEl.textContent = solvedProblems.size.toLocaleString();
    if (statStarredEl) statStarredEl.textContent = starredProblems.size.toLocaleString();

    showToast(`🎉 Successfully imported (${mode === 'overwrite' ? 'Overwritten' : 'Merged'}): ${solvedList.length} solved, ${starredList.length} bookmarked!`, 'success');
    closeBackupModal();
  } catch (err) {
    console.error('Import error:', err);
    showToast(`❌ Import failed: ${err.message}`, 'error');
  }
}

function handleFileSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const dropzoneText = document.getElementById('dropzone-text');
  if (dropzoneText) dropzoneText.textContent = `Reading ${file.name}...`;

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    processImportJsonString(text);
  };
  reader.onerror = () => {
    showToast('❌ Error reading selected file.', 'error');
  };
  reader.readAsText(file);
}

function handlePasteImport() {
  const pasteArea = document.getElementById('import-paste-area');
  const text = (pasteArea?.value || '').trim();
  if (!text) {
    showToast('⚠️ Please paste JSON backup text first.', 'error');
    return;
  }
  processImportJsonString(text);
}

function resetAllProgress() {
  const count = solvedProblems.size + starredProblems.size;
  if (count === 0) {
    showToast('ℹ️ No saved progress to reset.', 'info');
    return;
  }

  const confirmed = window.confirm(`Are you sure you want to reset all progress?\n\nThis will permanently clear ${solvedProblems.size} solved questions and ${starredProblems.size} bookmarks from browser storage.\n\nMake sure to Export a backup if you want to keep your progress!`);
  if (!confirmed) return;

  solvedProblems.clear();
  starredProblems.clear();

  updateSolvedStats();
  updateStarredStats();

  if (document.getElementById('solved-view')?.classList.contains('active')) {
    renderSolvedView();
  } else if (document.getElementById('bookmarks-view')?.classList.contains('active')) {
    renderBookmarksView();
  } else if (document.getElementById('topic-problems-view')?.classList.contains('active')) {
    renderTopicProblems();
  } else if (document.getElementById('company-topics-view')?.classList.contains('active')) {
    renderCompanyTopics();
  } else if (!document.getElementById('home-view')?.classList.contains('hidden')) {
    filterCompanies();
  }

  showToast('🧹 All progress has been reset.', 'info');
  closeBackupModal();
}

// Toast Notifications System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconMap = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <span class="toast-icon">${iconMap[type] || '🔔'}</span>
    <span class="toast-msg">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) scale(0.95)';
    setTimeout(() => toast.remove(), 300);
  }, 3800);
}

// Drag & Drop Setup for Dropzone
function setupDropzone() {
  const dropzone = document.getElementById('backup-dropzone');
  if (!dropzone) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      const file = files[0];
      const dropzoneText = document.getElementById('dropzone-text');
      if (dropzoneText) dropzoneText.textContent = `Reading ${file.name}...`;

      const reader = new FileReader();
      reader.onload = (ev) => {
        processImportJsonString(ev.target.result);
      };
      reader.onerror = () => {
        showToast('❌ Error reading dropped file.', 'error');
      };
      reader.readAsText(file);
    }
  });
}

// Debounced Cloud Sync
let cloudSyncTimeout = null;
function syncToCloudDebounced() {
  if (cloudSyncTimeout) clearTimeout(cloudSyncTimeout);
  cloudSyncTimeout = setTimeout(() => {
    if (window.FirebaseService && window.FirebaseService.getCurrentUser()) {
      const datesObj = {};
      solvedDates.forEach((date, title) => { datesObj[title] = date; });
      window.FirebaseService.saveProgressToCloud(
        Array.from(solvedProblems),
        Array.from(starredProblems),
        datesObj,
        reviewProblems
      );
    }
  }, 400);
}

// ============================================================
// FIREBASE AUTH & CLOUD SYNC CONTROLLERS
// ============================================================

function openAuthModal() {
  // Update profile counts if user is logged in
  const user = window.FirebaseService?.getCurrentUser();
  if (user) {
    updateAuthUserUI(user);
  }

  document.getElementById('auth-modal')?.classList.add('active');
}

function closeAuthModal() {
  document.getElementById('auth-modal')?.classList.remove('active');
}

async function handleGoogleSignIn() {
  try {
    const user = await window.FirebaseService.signInWithGoogle();
    if (user) {
      showToast(`👋 Welcome back, ${user.displayName || user.email}!`, 'success');
    }
  } catch (err) {
    console.error("Google sign-in error:", err);
    if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
      showToast("⚠️ Domain unauthorized: Add 'localhost' and '127.0.0.1' in Firebase Console > Authentication > Settings > Authorized domains.", 'error');
    } else if (err.code === 'auth/popup-closed-by-user') {
      showToast("ℹ️ Sign-in popup was closed.", 'info');
    } else {
      showToast(`❌ Google Sign-In failed: ${err.message}`, 'error');
    }
  }
}

async function handleSignOut() {
  try {
    if (window.FirebaseService) {
      await window.FirebaseService.logoutUser();
    }
    cloudAuthoritativeDataLoaded = false;
    solvedProblems.clear();
    starredProblems.clear();
    reviewProblems = [];
    localStorage.removeItem('leetcode_solved_v1');
    localStorage.removeItem('leetcode_starred_v1');
    localStorage.removeItem('leetcode_review_problems_v1');
    updateSolvedStats(true);
    updateStarredStats(true);
    if (typeof renderReviewTracker === 'function') renderReviewTracker();
    closeAuthModal();

    document.body.classList.add('auth-locked');
    const gate = document.getElementById('auth-gate-screen');
    const content = document.getElementById('app-content');
    if (gate) {
      gate.style.display = 'flex';
      gate.style.setProperty('display', 'flex', 'important');
    }
    if (content) {
      content.style.display = 'none';
      content.style.setProperty('display', 'none', 'important');
    }
    if (typeof goHome === 'function') goHome();

    showToast("👋 Signed out successfully.", "info");
  } catch (err) {
    showToast(`❌ Sign out failed: ${err.message}`, 'error');
  }
}

async function triggerManualCloudSync() {
  if (!window.FirebaseService || !window.FirebaseService.getCurrentUser()) {
    showToast("⚠️ Please sign in to sync with Cloud Firestore.", "error");
    return;
  }
  try {
    const datesObj = {};
    solvedDates.forEach((date, title) => { datesObj[title] = date; });
    const success = await window.FirebaseService.saveProgressToCloud(
      Array.from(solvedProblems),
      Array.from(starredProblems),
      datesObj,
      reviewProblems
    );
    if (success) {
      showToast("☁️ Progress successfully synced to Cloud Firestore!", "success");
    }
  } catch (err) {
    showToast(`❌ Sync failed: ${err.message}`, "error");
  }
}

function updateAuthUserUI(user) {
  const authBtn = document.getElementById('auth-btn');
  const authLabel = document.getElementById('auth-btn-label');
  const syncDot = document.getElementById('sync-dot');
  const loggedOutView = document.getElementById('auth-logged-out-view');
  const loggedInView = document.getElementById('auth-logged-in-view');

  if (user) {
    const name = user.displayName || user.email.split('@')[0];
    if (authLabel) authLabel.textContent = name;
    if (authBtn) {
      authBtn.classList.add('logged-in');
      authBtn.title = `Signed in as ${user.email} (Cloud Sync Active)`;
    }
    if (syncDot) syncDot.className = 'sync-dot synced';

    if (loggedOutView) loggedOutView.style.display = 'none';
    if (loggedInView) loggedInView.style.display = 'block';

    const userDispName = document.getElementById('user-display-name');
    const userEmail = document.getElementById('user-email');
    const userAvatar = document.getElementById('user-avatar');
    const pSolved = document.getElementById('profile-solved-count');
    const pStarred = document.getElementById('profile-starred-count');

    if (userDispName) userDispName.textContent = user.displayName || 'Learner';
    if (userEmail) userEmail.textContent = user.email || '';
    if (pSolved) pSolved.textContent = solvedProblems.size;
    if (pStarred) pStarred.textContent = starredProblems.size;

    if (userAvatar) {
      if (user.photoURL) {
        userAvatar.innerHTML = `<img src="${escapeHtml(user.photoURL)}" alt="Avatar">`;
      } else {
        const initial = (user.displayName || user.email || 'U')[0].toUpperCase();
        userAvatar.textContent = initial;
      }
    }
  } else {
    if (authLabel) authLabel.textContent = 'Cloud Sync';
    if (authBtn) {
      authBtn.classList.remove('logged-in');
      authBtn.title = 'Firebase Cloud Sync & Account';
    }
    if (syncDot) syncDot.className = 'sync-dot';

    if (loggedOutView) loggedOutView.style.display = 'block';
    if (loggedInView) loggedInView.style.display = 'none';
  }
}

// Data Script Dynamic Loader (deferred until verified authentication)
let dataScriptsLoaded = false;
let dataLoadingPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.querySelectorAll('script')).find(s => s.src && s.src.includes(src.split('?')[0]));
    if (existing) {
      existing.remove();
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = () => {
      console.log(`[DSA Tracker] Script loaded successfully: ${src}`);
      resolve();
    };
    script.onerror = (err) => {
      console.error(`[DSA Tracker] Failed to load script: ${src}`, err);
      reject(err);
    };
    (document.head || document.body).appendChild(script);
  });
}

async function loadTrackerDataScripts() {
  if (window.LEETCODE_DATA && Object.keys(window.LEETCODE_DATA).length > 0) {
    dataScriptsLoaded = true;
    return;
  }
  if (dataScriptsLoaded) return;
  if (dataLoadingPromise) return dataLoadingPromise;

  console.log('[DSA Tracker] Verified owner authenticated. Downloading dataset scripts...');
  dataLoadingPromise = (async () => {
    try {
      await loadScript('data.js?v=2.8.0');
      // solvedQuestion.js is loaded statically in index.html
      dataScriptsLoaded = true;
      console.log('[DSA Tracker] All dataset scripts successfully loaded and initialized!');
    } catch (err) {
      dataScriptsLoaded = false;
      dataLoadingPromise = null;
      throw err;
    }
  })();

  return dataLoadingPromise;
}

// Global Firebase Event Listeners
const ALLOWED_EMAIL = 'codedbysandeep@gmail.com';

function isAllowedUser(user) {
  if (!user || !user.email) return false;
  return user.email.trim().toLowerCase() === ALLOWED_EMAIL.toLowerCase();
}

async function handleAuthState(user) {
  const gate = document.getElementById('auth-gate-screen');
  const content = document.getElementById('app-content');
  const gateBtn = document.querySelector('#auth-gate-screen .gate-google-btn, #auth-gate-screen .google-sign-in-btn, #auth-gate-screen .auth-gate-btn');
  const loadingEl = document.getElementById('data-loading-indicator');

  if (user && isAllowedUser(user)) {
    if (loadingEl) loadingEl.style.display = 'block';
    if (gateBtn) {
      gateBtn.innerHTML = `<span>⏳</span> Authenticated! Loading dataset...`;
      gateBtn.style.pointerEvents = 'none';
    }
    try {
      await loadTrackerDataScripts();
    } catch (err) {
      console.error('Failed to load tracker data:', err);
      if (loadingEl) loadingEl.style.display = 'none';
      if (gateBtn) {
        gateBtn.innerHTML = `<span>❌</span> Failed to load dataset. Please refresh.`;
        gateBtn.style.pointerEvents = 'auto';
      }
      return; // keep gate visible if data fails to load
    }
    if (loadingEl) loadingEl.style.display = 'none';
    document.body.classList.remove('auth-locked');
    if (gate) {
      gate.style.display = 'none';
      gate.style.setProperty('display', 'none', 'important');
    }
    if (content) {
      content.style.display = 'block';
      content.style.setProperty('display', 'block', 'important');
    }
    updateAuthUserUI(user);
    initData();
    renderCompanies();
    if (typeof renderSolvedHeatmap === 'function') renderSolvedHeatmap();
    if (typeof renderReviewTracker === 'function') renderReviewTracker();
  } else {
    document.body.classList.add('auth-locked');
    if (loadingEl) loadingEl.style.display = 'none';
    if (gate) {
      gate.style.display = 'flex';
      gate.style.setProperty('display', 'flex', 'important');
    }
    if (content) {
      content.style.display = 'none';
      content.style.setProperty('display', 'none', 'important');
    }
    if (gateBtn) {
      gateBtn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" style="flex-shrink:0;">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
        </svg>
        <span>Sign in with Google</span>
      `;
      gateBtn.style.pointerEvents = 'auto';
    }
    updateAuthUserUI(null);
  }
}

window.addEventListener('firebase-auth-change', (e) => {
  handleAuthState(e.detail?.user);
});

window.addEventListener('cloud-data-received', (e) => {
  const { solvedProblems: cloudSolved, starredProblems: cloudStarred, solvedDates: cloudDates, reviewProblems: cloudReviews } = e.detail;

  cloudAuthoritativeDataLoaded = true;

  // Cloud Firestore is the authoritative source of truth for the logged-in user
  solvedProblems = new Set((cloudSolved || []).map(t => (typeof t === 'string' ? t.trim() : t)));
  starredProblems = new Set((cloudStarred || []).map(t => (typeof t === 'string' ? t.trim() : t)));
  // Restore solved dates from cloud
  solvedDates = new Map();
  if (cloudDates && typeof cloudDates === 'object') {
    Object.entries(cloudDates).forEach(([title, date]) => {
      if (title && date) solvedDates.set(title.trim(), date);
    });
  }

  // Restore review problems from cloud
  if (Array.isArray(cloudReviews)) {
    reviewProblems = cloudReviews;
    try {
      localStorage.setItem('leetcode_review_problems_v1', JSON.stringify(reviewProblems));
    } catch {}
  }

  // Update local storage and UI counters without triggering another cloud write
  updateSolvedStats(true);
  updateStarredStats(true);
  if (typeof renderSolvedHeatmap === 'function') renderSolvedHeatmap();
  if (typeof renderReviewTracker === 'function') renderReviewTracker();

  // Re-render active view to immediately reflect additions/removals
  if (document.getElementById('solved-view')?.classList.contains('active')) {
    if (typeof renderSolvedView === 'function') renderSolvedView();
  } else if (document.getElementById('bookmarks-view')?.classList.contains('active')) {
    renderBookmarksView();
  } else if (document.getElementById('topic-problems-view')?.classList.contains('active')) {
    renderTopicProblems();
  } else if (document.getElementById('company-topics-view')?.classList.contains('active')) {
    renderCompanyTopics();
  } else if (!document.getElementById('home-view')?.classList.contains('hidden')) {
    if (companyList && companyList.length > 0) filterCompanies();
  }

  const pSolved = document.getElementById('profile-solved-count');
  const pStarred = document.getElementById('profile-starred-count');
  if (pSolved) pSolved.textContent = solvedProblems.size;
  if (pStarred) pStarred.textContent = starredProblems.size;
});

window.addEventListener('cloud-new-user-init', () => {
  // Brand new account (no cloud document yet): upload local storage data once
  if (solvedProblems.size > 0 || starredProblems.size > 0 || reviewProblems.length > 0) {
    if (window.FirebaseService && window.FirebaseService.getCurrentUser()) {
      const datesObj = {};
      solvedDates.forEach((date, title) => { datesObj[title] = date; });
      window.FirebaseService.saveProgressToCloud(
        Array.from(solvedProblems),
        Array.from(starredProblems),
        datesObj,
        reviewProblems
      );
    }
  }
});

window.addEventListener('cloud-sync-status', (e) => {
  const syncDot = document.getElementById('sync-dot');
  const statusText = document.getElementById('cloud-sync-status-text');
  const status = e.detail?.status;

  if (syncDot) {
    if (status === 'synced') syncDot.className = 'sync-dot synced';
    else if (status === 'syncing') syncDot.className = 'sync-dot syncing';
    else if (status === 'error') syncDot.className = 'sync-dot error';
  }

  if (statusText) {
    if (status === 'synced') statusText.textContent = `Synced (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    else if (status === 'syncing') statusText.textContent = 'Syncing...';
    else if (status === 'error') statusText.textContent = 'Sync Error';
  }
});

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  setupDropzone();
  if (window.FirebaseService) {
    const user = window.FirebaseService.getCurrentUser();
    if (user && isAllowedUser(user)) {
      handleAuthState(user);
    } else {
      document.body.classList.add('auth-locked');
    }
  } else {
    document.body.classList.add('auth-locked');
  }
});

/* ── Solved Activity Heatmap ─────────────────────────────────────────────── */
function renderSolvedHeatmap() {
  const grid         = document.getElementById('heatmap-grid');
  const monthsEl     = document.getElementById('heatmap-months');
  const totalEl      = document.getElementById('heatmap-total-count');
  const activeDaysEl = document.getElementById('heatmap-active-days');
  const maxStreakEl  = document.getElementById('heatmap-max-streak');
  const past7DaysEl  = document.getElementById('heatmap-past-7-days');
  const curMonthEl   = document.getElementById('heatmap-current-month');
  if (!grid || !monthsEl) return;

  // ── 1. Build date→count map from solvedDates (UTC calendar day) ───────────
  const dayCount = new Map(); // 'YYYY-MM-DD' → count
  if (typeof solvedProblems !== 'undefined' && typeof solvedDates !== 'undefined') {
    solvedProblems.forEach((rawTitle) => {
      const title = typeof rawTitle === 'string' ? rawTitle.trim() : rawTitle;
      const iso = solvedDates.get(title) || solvedDates.get(rawTitle);
      if (!iso) return;
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return;
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
        dayCount.set(key, (dayCount.get(key) || 0) + 1);
      } catch {}
    });
  }

  // ── 2. Date range: 1 year window (today going back 365 days) ─────────────
  const todayUTC = new Date();
  const endDay   = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), todayUTC.getUTCDate()));
  const startDay = new Date(Date.UTC(endDay.getUTCFullYear() - 1, endDay.getUTCMonth(), endDay.getUTCDate() + 1));

  // ── 3. Compute stats over the 1-year window ───────────────────────────────
  let totalSolved   = 0;
  let activeDays    = 0;
  let maxStreak     = 0;
  let curStreak     = 0;
  let prevWasActive = false;

  for (let d = new Date(startDay); d <= endDay; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
    const cnt = dayCount.get(key) || 0;
    totalSolved += cnt;
    if (cnt > 0) {
      activeDays++;
      curStreak = prevWasActive ? curStreak + 1 : 1;
      if (curStreak > maxStreak) maxStreak = curStreak;
      prevWasActive = true;
    } else {
      curStreak = 0;
      prevWasActive = false;
    }
  }

  // ── 3b. Past 7 days and Current month calculations ────────────────────────
  let past7DaysSolved = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.UTC(endDay.getUTCFullYear(), endDay.getUTCMonth(), endDay.getUTCDate() - i));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    past7DaysSolved += (dayCount.get(key) || 0);
  }

  let currentMonthSolved = 0;
  const curYearNum = endDay.getUTCFullYear();
  const curMonthNum = endDay.getUTCMonth();
  const daysInCurMonth = new Date(Date.UTC(curYearNum, curMonthNum + 1, 0)).getUTCDate();
  for (let day = 1; day <= daysInCurMonth; day++) {
    const key = `${curYearNum}-${String(curMonthNum + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    currentMonthSolved += (dayCount.get(key) || 0);
  }

  if (totalEl)      totalEl.textContent      = totalSolved;
  if (activeDaysEl) activeDaysEl.textContent = activeDays;
  if (maxStreakEl)  maxStreakEl.textContent   = maxStreak;
  if (past7DaysEl)  past7DaysEl.textContent  = past7DaysSolved;
  if (curMonthEl)   curMonthEl.textContent   = currentMonthSolved;

  // ── 4 & 5. Render month blocks matching LeetCode structure ────────────────
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  monthsEl.innerHTML = '';
  grid.innerHTML = '';

  const monthsFrag = document.createDocumentFragment();
  const gridFrag   = document.createDocumentFragment();

  let curYear  = startDay.getUTCFullYear();
  let curMonth = startDay.getUTCMonth();
  const endYear  = endDay.getUTCFullYear();
  const endMonth = endDay.getUTCMonth();

  while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
    const firstDayOfMonth = new Date(Date.UTC(curYear, curMonth, 1));
    const lastDayOfMonth  = new Date(Date.UTC(curYear, curMonth + 1, 0));
    const totalDaysInMonth = lastDayOfMonth.getUTCDate();
    const startDow = firstDayOfMonth.getUTCDay(); // 0=Sun..6=Sat
    const totalCols = Math.floor((startDow + totalDaysInMonth - 1) / 7) + 1;
    const monthWidth = totalCols * 11 + (totalCols - 1) * 3;

    // Month Label
    const lbl = document.createElement('span');
    lbl.className = 'heatmap-month-label';
    lbl.textContent = MONTH_NAMES[curMonth];
    lbl.style.width = `${monthWidth}px`;
    lbl.style.display = 'inline-block';
    monthsFrag.appendChild(lbl);

    // Month Group
    const monthGroup = document.createElement('div');
    monthGroup.className = 'heatmap-month-group';

    for (let colIdx = 0; colIdx < totalCols; colIdx++) {
      const colEl = document.createElement('div');
      colEl.className = 'heatmap-col';

      for (let row = 0; row < 7; row++) {
        const dayOfMonth = colIdx * 7 + row - startDow + 1;
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';

        if (dayOfMonth < 1 || dayOfMonth > totalDaysInMonth) {
          cell.classList.add('heatmap-empty');
          colEl.appendChild(cell);
          continue;
        }

        const cellDate = new Date(Date.UTC(curYear, curMonth, dayOfMonth));
        if (cellDate < startDay || cellDate > endDay) {
          cell.classList.add('heatmap-empty');
          colEl.appendChild(cell);
          continue;
        }

        const key = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
        const cnt = dayCount.get(key) || 0;

        // Level thresholds: 0 → gray, 1 → dim green, 2-3 → mid green, 4+ → bright green
        let level = 0;
        if (cnt >= 4) level = 3;
        else if (cnt >= 2) level = 2;
        else if (cnt === 1) level = 1;
        else level = 0;
        cell.classList.add(`level-${level}`);

        const dateLabel = `${MONTH_NAMES[curMonth]} ${dayOfMonth}, ${curYear}`;
        cell.title = cnt > 0
          ? `${cnt} solved on ${dateLabel}`
          : `No submissions on ${dateLabel}`;

        colEl.appendChild(cell);
      }

      monthGroup.appendChild(colEl);
    }

    gridFrag.appendChild(monthGroup);

    // Advance to next month
    curMonth++;
    if (curMonth > 11) {
      curMonth = 0;
      curYear++;
    }
  }

  monthsEl.appendChild(monthsFrag);
  grid.appendChild(gridFrag);
}


// Expose globally so solvedQuestion.js can call it after date edits
window.renderSolvedHeatmap = renderSolvedHeatmap;

/* ── HTML Escape Helper ─────────────────────────────────────────────────── */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── DSA Spaced Repetition Review Tracker ───────────────────────────────── */
const REVIEW_INTERVALS = [3, 7, 14, 30, 60]; // Days between successive review stages

function getReviewDaysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function getReviewTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getReviewDaysBetween(a, b) {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

function saveReviewProblems() {
  try {
    localStorage.setItem('leetcode_review_problems_v1', JSON.stringify(reviewProblems));
  } catch (e) {
    console.error("Error saving review problems to localStorage:", e);
  }
  syncToCloudDebounced();
}

function toggleReviewForm(force) {
  const form = document.getElementById('review-form-card');
  const btn = document.getElementById('review-toggle-form-btn');
  if (!form) return;
  
  const show = typeof force === 'boolean' ? force : (form.style.display === 'none' || !form.style.display);
  form.style.display = show ? 'block' : 'none';
  if (btn) {
    btn.innerHTML = show
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg><span>Close</span>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Add</span>`;
  }
  
  if (show) {
    // Populate datalist with solved problems for autocomplete
    const dl = document.getElementById('review-problems-datalist');
    if (dl && typeof solvedProblems !== 'undefined') {
      dl.innerHTML = '';
      Array.from(solvedProblems).slice(0, 80).forEach(title => {
        const opt = document.createElement('option');
        opt.value = title;
        dl.appendChild(opt);
      });
    }
    const nameInput = document.getElementById('review-input-name');
    if (nameInput) setTimeout(() => nameInput.focus(), 50);
  }
}

function addReviewProblem() {
  const nameInput = document.getElementById('review-input-name');
  const patternInput = document.getElementById('review-input-pattern');
  const notesInput = document.getElementById('review-input-notes');
  if (!nameInput) return;

  const name = (nameInput.value || '').trim();
  const pattern = (patternInput?.value || '').trim();
  const notes = (notesInput?.value || '').trim();

  if (!name) {
    showToast('⚠️ Please enter a problem name.', 'warning');
    nameInput.focus();
    return;
  }

  const p = {
    id: Date.now().toString(),
    name: name,
    pattern: pattern,
    notes: notes,
    solvedDate: getReviewTodayStr(),
    stage: 0,
    nextReview: getReviewDaysFromNow(REVIEW_INTERVALS[0]),
    history: []
  };

  reviewProblems = [p, ...reviewProblems];
  saveReviewProblems();
  renderReviewTracker();

  nameInput.value = '';
  if (patternInput) patternInput.value = '';
  if (notesInput) notesInput.value = '';
  toggleReviewForm(false);
  showToast(`🔥 Added "${name}" to Spaced Review! Due in 3 days.`, 'success');
}

function markReviewResult(id, passed) {
  const today = getReviewTodayStr();
  const p = reviewProblems.find(item => item.id === String(id));
  if (!p) return;

  if (!Array.isArray(p.history)) p.history = [];
  p.history.push({ date: today, passed: !!passed });

  if (passed) {
    const nextStage = Math.min((p.stage || 0) + 1, REVIEW_INTERVALS.length - 1);
    p.stage = nextStage;
    p.nextReview = getReviewDaysFromNow(REVIEW_INTERVALS[nextStage]);
    saveReviewProblems();
    renderReviewTracker();
    showToast(`✅ Solved cold! Advanced "${p.name}" to Stage ${nextStage + 1} (Next review in ${REVIEW_INTERVALS[nextStage]} days).`, 'success');
  } else {
    p.stage = 0;
    p.nextReview = getReviewDaysFromNow(REVIEW_INTERVALS[0]);
    saveReviewProblems();
    renderReviewTracker();
    showToast(`🔄 Reset "${p.name}" to Stage 1. Cold retry scheduled in 3 days.`, 'info');
  }
}

function removeReviewProblem(id) {
  const p = reviewProblems.find(item => item.id === String(id));
  const pName = p ? p.name : 'Problem';
  reviewProblems = reviewProblems.filter(item => item.id !== String(id));
  saveReviewProblems();
  renderReviewTracker();
  showToast(`🗑️ Removed "${pName}" from review schedule.`, 'info');
}

function renderReviewTracker() {
  const dueListEl = document.getElementById('review-due-list');
  const upcomingListEl = document.getElementById('review-upcoming-list');
  const dueBadge = document.getElementById('review-due-badge');
  const upcomingBadge = document.getElementById('review-upcoming-badge');
  if (!dueListEl || !upcomingListEl) return;

  const today = getReviewTodayStr();
  const dueToday = reviewProblems
    .filter(p => (p.nextReview || '') <= today)
    .sort((a, b) => (a.nextReview || '').localeCompare(b.nextReview || ''));

  const upcoming = reviewProblems
    .filter(p => (p.nextReview || '') > today)
    .sort((a, b) => (a.nextReview || '').localeCompare(b.nextReview || ''));

  if (dueBadge) {
    dueBadge.textContent = dueToday.length;
    if (dueToday.length > 0) {
      dueBadge.style.boxShadow = '0 0 8px rgba(255, 161, 22, 0.4)';
    } else {
      dueBadge.style.boxShadow = 'none';
    }
  }
  if (upcomingBadge) {
    upcomingBadge.textContent = upcoming.length;
  }

  // Render Due Today
  if (dueToday.length === 0) {
    dueListEl.innerHTML = `<div class="review-empty-state">✨ Nothing due for review today. Add a problem above to start spaced retries!</div>`;
  } else {
    dueListEl.innerHTML = dueToday.map(p => {
      const diff = getReviewDaysBetween(today, p.nextReview);
      const dueLabel = diff < 0 ? `Overdue by ${Math.abs(diff)}d` : 'Due today';
      const stageNum = (p.stage || 0) + 1;
      const notesHtml = p.notes ? `<div class="review-item-notes" title="${escapeHtml(p.notes)}">💡 ${escapeHtml(p.notes)}</div>` : '';
      const patternHtml = p.pattern ? `<span class="review-pattern-pill">${escapeHtml(p.pattern)}</span>` : '';

      return `
        <div class="review-item-card is-due" id="review-card-${escapeHtml(p.id)}">
          <div class="review-item-info">
            <div class="review-item-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
            <div class="review-item-meta">
              ${patternHtml}
              <span class="review-stage-pill">Stage ${stageNum}/5</span>
              <span class="review-due-status">${dueLabel}</span>
            </div>
            ${notesHtml}
          </div>
          <div class="review-actions">
            <button class="review-action-btn pass" onclick="markReviewResult('${escapeHtml(p.id)}', true)" title="Solved cold (Advance stage)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
            <button class="review-action-btn fail" onclick="markReviewResult('${escapeHtml(p.id)}', false)" title="Couldn't solve cold (Reset to Day 3)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <button class="review-action-btn del" onclick="removeReviewProblem('${escapeHtml(p.id)}')" title="Remove from reviews">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Upcoming
  if (upcoming.length === 0) {
    upcomingListEl.innerHTML = `<div class="review-empty-state">No upcoming reviews scheduled.</div>`;
  } else {
    upcomingListEl.innerHTML = upcoming.map(p => {
      const days = getReviewDaysBetween(today, p.nextReview);
      const stageNum = (p.stage || 0) + 1;
      const patternHtml = p.pattern ? `<span class="review-pattern-pill">${escapeHtml(p.pattern)}</span>` : '';

      return `
        <div class="review-item-card" id="review-card-${escapeHtml(p.id)}">
          <div class="review-item-info">
            <div class="review-item-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
            <div class="review-item-meta">
              ${patternHtml}
              <span class="review-stage-pill">Stage ${stageNum}/5</span>
              <span>Next in ${days}d (${escapeHtml(p.nextReview)})</span>
            </div>
          </div>
          <div class="review-actions">
            <button class="review-action-btn del" onclick="removeReviewProblem('${escapeHtml(p.id)}')" title="Remove from reviews">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Expose review tracker functions globally
window.toggleReviewForm = toggleReviewForm;
window.addReviewProblem = addReviewProblem;
window.markReviewResult = markReviewResult;
window.removeReviewProblem = removeReviewProblem;
window.renderReviewTracker = renderReviewTracker;

