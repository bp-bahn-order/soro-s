#pragma once

#include <version>

#if defined(_LIBCPP_VERSION) && _LIBCPP_VERSION <= 15000
#include <experimental/coroutine>
#else
#include <coroutine>
#endif

#if defined(_LIBCPP_VERSION) && _LIBCPP_VERSION <= 15000
namespace coro = std::experimental;
#else
namespace coro = std;
#endif
