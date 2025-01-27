#pragma once

#include <algorithm>
#include <iterator>

#include "soro/base/soro_types.h"

#include "soro/utls/sassert.h"
#include "soro/utls/std_wrapper/std_wrapper.h"

namespace soro::utls {

/*
 * Sorts both containers and returns the intersection of both.
 * Containers will be modified by reordering the elements.
 */

template <typename Container>
inline Container sort_and_intersect(Container& c1, Container& c2) {
  std::sort(std::begin(c1), std::end(c1));
  std::sort(std::begin(c2), std::end(c2));

  Container result;
  result.reserve(c1.size());

  std::set_intersection(std::cbegin(c1), std::cend(c1), std::cbegin(c2),
                        std::cend(c2), std::back_inserter(result));

  return result;
}

template <typename C1, typename C2>
inline auto intersect(C1&& c1, C2&& c2) {
  utls::sassert(utls::is_sorted(c1),
                "Container c1 is not sorted before intersecting.");
  utls::sassert(utls::is_sorted(c2),
                "Container c2 is not sorted before intersecting.");

  soro::vector<typename std::remove_reference_t<C1>::value_type> result;
  result.reserve(c1.size());

  std::set_intersection(std::cbegin(c1), std::cend(c1), std::cbegin(c2),
                        std::cend(c2), std::back_inserter(result));

  return result;
}

}  // namespace soro::utls
